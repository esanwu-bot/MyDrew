// Package ranking implements the AgentRank scoring algorithm with cold-start mitigation.
//
// AgentRank combines vector similarity with metadata-based signals to produce
// a final relevance score. During cold-start (low index volume), structural
// completeness and domain tag matching are boosted while reuse count is dampened.
package ranking

import (
	"context"
	"math"

	"github.com/esanwu-bot/MyDrew/server/internal/models"
	"github.com/esanwu-bot/MyDrew/server/internal/store"
)

// AgentRanker computes final relevance scores for search results.
type AgentRanker struct {
	store         *store.SnapshotStore
	coldStartCfg  ColdStartConfig
	indexVolumeFn func() int // returns current total indexed snapshots
}

// ColdStartConfig holds the dynamic weight parameters for cold-start mitigation.
type ColdStartConfig struct {
	// Threshold below which cold-start weights apply
	IndexVolumeThreshold int

	// Cold-start weight multipliers
	StructuralCompletenessBoost float64 // 2.5x during cold start
	DomainTagMatchBoost         float64 // 3.0x during cold start
	ReuseCountDampen            float64 // 0.3x during cold start
	CertifiedBoost              float64 // initial high score for official snapshots

	// Standard weights (post cold-start)
	WVectorSimilarity    float64
	WStructuralComplete  float64
	WDomainMatch         float64
	WReuseCount          float64
	WSuccessRate         float64
	WCertified           float64
}

// DefaultColdStartConfig returns the recommended cold-start configuration.
func DefaultColdStartConfig() ColdStartConfig {
	return ColdStartConfig{
		IndexVolumeThreshold:        100000,
		StructuralCompletenessBoost: 2.5,
		DomainTagMatchBoost:         3.0,
		ReuseCountDampen:            0.3,
		CertifiedBoost:              0.85,

		// Standard weights sum to ~1.0
		WVectorSimilarity:   0.35,
		WStructuralComplete: 0.15,
		WDomainMatch:        0.15,
		WReuseCount:         0.10,
		WSuccessRate:        0.15,
		WCertified:          0.10,
	}
}

// RankedResult represents a search result with its AgentRank score.
type RankedResult struct {
	TaskCID       string  `json:"task_cid"`
	VectorScore   float64 `json:"vector_score"`
	AgentRank     float64 `json:"agent_rank"`
	DomainMatch   bool    `json:"domain_match"`
	StructuralScore float64 `json:"structural_score"`
	ReuseCount    int     `json:"reuse_count"`
	IsCertified   bool    `json:"is_certified"`
}

// NewAgentRanker creates a new ranker instance.
func NewAgentRanker(s *store.SnapshotStore, volumeFn func() int) *AgentRanker {
	return &AgentRanker{
		store:         s,
		coldStartCfg:  DefaultColdStartConfig(),
		indexVolumeFn: volumeFn,
	}
}

// Rank computes AgentRank scores for a set of candidate snapshots given a query.
// vectorScores maps Task_CID → cosine similarity score from Qdrant.
func (r *AgentRanker) Rank(ctx context.Context, candidates []*models.AMDSnapshot, queryDomainTags []string, vectorScores map[string]float64) ([]RankedResult, error) {
	cfg := r.coldStartCfg
	volume := r.indexVolumeFn()
	coldStart := volume < cfg.IndexVolumeThreshold

	results := make([]RankedResult, 0, len(candidates))
	for _, snap := range candidates {
		vecScore := vectorScores[snap.Frontmatter.TaskCID]

		// Structural completeness: step count normalized to [0,1]
		structScore := structuralCompleteness(snap)
		if coldStart {
			structScore *= cfg.StructuralCompletenessBoost
			structScore = math.Min(structScore, 1.0)
		}

		// Domain tag match: Jaccard similarity with query tags
		domainScore := domainTagMatch(snap.Frontmatter.DomainTags, queryDomainTags)
		domainMatch := domainScore > 0
		if coldStart {
			domainScore *= cfg.DomainTagMatchBoost
			domainScore = math.Min(domainScore, 1.0)
		}

		// Reuse count (from snapshot_usage table)
		reuseCount, _ := r.store.GetUsageCount(ctx, snap.Frontmatter.TaskCID)
		reuseScore := normalizeReuse(reuseCount)
		if coldStart {
			reuseScore *= cfg.ReuseCountDampen
		}

		// Success rate (already [0,1])
		successScore := snap.Frontmatter.SuccessRateEst

		// Certified boost
		certScore := 0.0
		isCertified := snap.Frontmatter.BranchTag == "official" || snap.Frontmatter.BranchTag == "main"
		if isCertified {
			certScore = cfg.CertifiedBoost
			if coldStart {
				certScore = math.Min(certScore*1.2, 1.0)
			}
		}

		// Weighted sum
		rank := cfg.WVectorSimilarity*vecScore +
			cfg.WStructuralComplete*structScore +
			cfg.WDomainMatch*domainScore +
			cfg.WReuseCount*reuseScore +
			cfg.WSuccessRate*successScore +
			cfg.WCertified*certScore

		// Clamp to [0, 1]
		rank = math.Max(0, math.Min(1, rank))

		results = append(results, RankedResult{
			TaskCID:         snap.Frontmatter.TaskCID,
			VectorScore:     vecScore,
			AgentRank:       rank,
			DomainMatch:     domainMatch,
			StructuralScore: structScore,
			ReuseCount:      reuseCount,
			IsCertified:     isCertified,
		})
	}

	// Sort by AgentRank descending
	sortByRank(results)
	return results, nil
}

// structuralCompleteness scores how complete a snapshot is based on step count.
// 0 steps = 0.0, 1-3 steps = 0.3, 4-7 = 0.6, 8+ = 1.0
func structuralCompleteness(snap *models.AMDSnapshot) float64 {
	n := len(snap.Body.Steps)
	switch {
	case n == 0:
		return 0.0
	case n <= 3:
		return 0.3
	case n <= 7:
		return 0.6
	default:
		return 1.0
	}
}

// domainTagMatch computes Jaccard similarity between candidate and query tags.
func domainTagMatch(candidate, query []string) float64 {
	if len(query) == 0 || len(candidate) == 0 {
		return 0.0
	}
	qSet := make(map[string]bool, len(query))
	for _, t := range query {
		qSet[t] = true
	}
	intersection := 0
	for _, t := range candidate {
		if qSet[t] {
			intersection++
		}
	}
	union := len(qSet) + len(candidate) - intersection
	if union == 0 {
		return 0.0
	}
	return float64(intersection) / float64(union)
}

// normalizeReuse maps reuse count to [0,1] using log scale.
// 0 → 0.0, 1 → 0.2, 10 → 0.5, 100 → 0.8, 1000+ → 1.0
func normalizeReuse(count int) float64 {
	if count <= 0 {
		return 0.0
	}
	return math.Min(1.0, math.Log10(float64(count+1))/3.0)
}

// sortByRank sorts results by AgentRank descending (simple insertion sort for small N).
func sortByRank(results []RankedResult) {
	for i := 1; i < len(results); i++ {
		key := results[i]
		j := i - 1
		for j >= 0 && results[j].AgentRank < key.AgentRank {
			results[j+1] = results[j]
			j--
		}
		results[j+1] = key
	}
}
