// Package search orchestrates the indexing pipeline and hybrid search,
// combining PostgreSQL scalar storage, Qdrant vector search, BGE-M3 embeddings,
// and the AgentRank scoring algorithm.
package search

import (
	"context"
	"fmt"
	"log"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/esanwu-bot/MyDrew/server/internal/embedding"
	"github.com/esanwu-bot/MyDrew/server/internal/models"
	"github.com/esanwu-bot/MyDrew/server/internal/ranking"
	"github.com/esanwu-bot/MyDrew/server/internal/store"
	"github.com/esanwu-bot/MyDrew/server/internal/vectorstore"
)

// Service ties together all search-related dependencies.
type Service struct {
	store     *store.SnapshotStore
	qdrant    *vectorstore.QdrantClient
	embedder  *embedding.Client

	// In-memory count for cold-start threshold (updated periodically)
	mu          sync.RWMutex
	indexVolume int
}

// NewService creates a new search service.
func NewService(s *store.SnapshotStore, q *vectorstore.QdrantClient, e *embedding.Client) *Service {
	svc := &Service{
		store:    s,
		qdrant:   q,
		embedder: e,
	}
	// Initialize Qdrant collection
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := q.EnsureCollection(ctx); err != nil {
		log.Printf("WARNING: failed to ensure Qdrant collection: %v", err)
	}
	// Refresh index volume counter
	svc.refreshVolume()
	return svc
}

// IndexSnapshot parses and indexes a snapshot: store in PostgreSQL + vectorize + store in Qdrant.
func (svc *Service) IndexSnapshot(ctx context.Context, snap *models.AMDSnapshot) error {
	// 1. Store in PostgreSQL
	if err := svc.store.Upsert(ctx, snap); err != nil {
		return fmt.Errorf("store snapshot: %w", err)
	}

	// 2. Generate embedding from task goal + domain tags
	embedText := buildEmbedText(snap)
	vector, err := svc.embedder.EmbedSingle(ctx, embedText)
	if err != nil {
		return fmt.Errorf("embed snapshot: %w", err)
	}

	// 3. Upsert to Qdrant
	point := vectorstore.Point{
		ID:     snap.Frontmatter.TaskCID,
		Vector: vector,
		Payload: map[string]interface{}{
			"task_cid":            snap.Frontmatter.TaskCID,
			"domain_tags":         snap.Frontmatter.DomainTags,
			"execution_framework": snap.Frontmatter.ExecutionFramework,
			"branch_tag":          snap.Frontmatter.BranchTag,
			"success_rate_est":    snap.Frontmatter.SuccessRateEst,
			"verified":            false,
		},
	}
	if err := svc.qdrant.Upsert(ctx, []vectorstore.Point{point}); err != nil {
		return fmt.Errorf("upsert vector point: %w", err)
	}

	// 4. Refresh volume counter
	svc.refreshVolume()

	log.Printf("Indexed snapshot %s (%d steps, %d tags)",
		snap.Frontmatter.TaskCID, len(snap.Body.Steps), len(snap.Frontmatter.DomainTags))
	return nil
}

// SearchResult represents a final search result with all scoring details.
type SearchResult struct {
	TaskCID         string   `json:"task_cid"`
	AgentRank       float64  `json:"agent_rank"`
	VectorScore     float64  `json:"vector_score"`
	DomainTags      []string `json:"domain_tags"`
	Framework       string   `json:"execution_framework"`
	SuccessRate     float64  `json:"success_rate_est"`
	AvgTokenCost    int      `json:"avg_token_cost"`
	BranchTag       string   `json:"branch_tag"`
	TaskGoal        string   `json:"task_goal"`
	StepCount       int      `json:"step_count"`
	ReuseCount      int      `json:"reuse_count"`
	IsCertified     bool     `json:"is_certified"`
}

// Search performs hybrid search: vector similarity + scalar filtering + AgentRank scoring.
func (svc *Service) Search(ctx context.Context, query string, domainTags []string, framework string, limit int) ([]SearchResult, error) {
	if limit <= 0 || limit > 100 {
		limit = 10
	}

	// 1. Embed query
	queryVector, err := svc.embedder.EmbedSingle(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("embed query: %w", err)
	}

	// 2. Vector search in Qdrant with optional payload filter
	qdrantFilter := make(map[string]interface{})
	if len(domainTags) > 0 {
		qdrantFilter["domain_tags"] = domainTags
	}
	if framework != "" {
		qdrantFilter["execution_framework"] = framework
	}

	// Fetch more candidates for re-ranking
	candidateLimit := limit * 3
	if candidateLimit < 50 {
		candidateLimit = 50
	}

	qdrantResults, err := svc.qdrant.Search(ctx, queryVector, qdrantFilter, candidateLimit)
	if err != nil {
		return nil, fmt.Errorf("vector search: %w", err)
	}

	if len(qdrantResults) == 0 {
		return []SearchResult{}, nil
	}

	// 3. Build vector score map
	vectorScores := make(map[string]float64, len(qdrantResults))
	for _, r := range qdrantResults {
		vectorScores[r.ID] = r.Score
	}

	// 4. Fetch full snapshot data from PostgreSQL
	var candidates []*models.AMDSnapshot
	for _, r := range qdrantResults {
		snap, err := svc.store.GetByCID(ctx, r.ID)
		if err != nil {
			log.Printf("WARNING: failed to fetch snapshot %s: %v", r.ID, err)
			continue
		}
		candidates = append(candidates, snap)
	}

	// 5. Apply additional scalar filters from PostgreSQL if needed
	if len(domainTags) > 0 || framework != "" {
		candidates = applyScalarFilters(candidates, domainTags, framework)
	}

	// 6. Rank with AgentRank
	ranker := ranking.NewAgentRanker(svc.store, func() int {
		svc.mu.RLock()
		defer svc.mu.RUnlock()
		return svc.indexVolume
	})

	ranked, err := ranker.Rank(ctx, candidates, domainTags, vectorScores)
	if err != nil {
		return nil, fmt.Errorf("rank candidates: %w", err)
	}

	// 7. Build final results
	results := make([]SearchResult, 0, limit)
	for i, r := range ranked {
		if i >= limit {
			break
		}
		// Find the corresponding snapshot
		var snap *models.AMDSnapshot
		for _, c := range candidates {
			if c.Frontmatter.TaskCID == r.TaskCID {
				snap = c
				break
			}
		}
		if snap == nil {
			continue
		}

		results = append(results, SearchResult{
			TaskCID:      r.TaskCID,
			AgentRank:    r.AgentRank,
			VectorScore:  r.VectorScore,
			DomainTags:   snap.Frontmatter.DomainTags,
			Framework:    snap.Frontmatter.ExecutionFramework,
			SuccessRate:  snap.Frontmatter.SuccessRateEst,
			AvgTokenCost: snap.Frontmatter.AvgTokenCost,
			BranchTag:    snap.Frontmatter.BranchTag,
			TaskGoal:     snap.Body.TaskGoal,
			StepCount:    len(snap.Body.Steps),
			ReuseCount:   r.ReuseCount,
			IsCertified:  r.IsCertified,
		})
	}

	return results, nil
}

// Volume returns the current index volume.
func (svc *Service) Volume() int {
	svc.mu.RLock()
	defer svc.mu.RUnlock()
	return svc.indexVolume
}

func (svc *Service) refreshVolume() {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_, total, err := svc.store.List(ctx, store.ListFilter{Limit: 1, IncludeDeprecated: false})
	if err != nil {
		return
	}
	svc.mu.Lock()
	svc.indexVolume = total
	svc.mu.Unlock()
}

// buildEmbedText creates the text to embed from snapshot metadata.
func buildEmbedText(snap *models.AMDSnapshot) string {
	var parts []string
	parts = append(parts, snap.Body.TaskGoal)
	parts = append(parts, snap.Frontmatter.DomainTags...)
	if snap.Frontmatter.ExecutionFramework != "" {
		parts = append(parts, snap.Frontmatter.ExecutionFramework)
	}
	// Include step titles for richer semantic content
	for _, step := range snap.Body.Steps {
		if step.Title != "" {
			parts = append(parts, step.Title)
		}
	}
	return strings.Join(parts, " ")
}

// applyScalarFilters applies additional in-memory scalar filters.
func applyScalarFilters(candidates []*models.AMDSnapshot, domainTags []string, framework string) []*models.AMDSnapshot {
	if len(domainTags) == 0 && framework == "" {
		return candidates
	}

	tagSet := make(map[string]bool, len(domainTags))
	for _, t := range domainTags {
		tagSet[t] = true
	}

	var filtered []*models.AMDSnapshot
	for _, snap := range candidates {
		if framework != "" && snap.Frontmatter.ExecutionFramework != framework {
			continue
		}
		if len(domainTags) > 0 {
			hasMatch := false
			for _, t := range snap.Frontmatter.DomainTags {
				if tagSet[t] {
					hasMatch = true
					break
				}
			}
			if !hasMatch {
				continue
			}
		}
		filtered = append(filtered, snap)
	}
	return filtered
}

// sortResultsByRank sorts results by AgentRank descending.
func sortResultsByRank(results []SearchResult) {
	sort.Slice(results, func(i, j int) bool {
		return results[i].AgentRank > results[j].AgentRank
	})
}
