// Package api implements the Drew REST API using the Gin framework.
package api

import (
	"net/http"

	"github.com/esanwu-bot/MyDrew/server/internal/parser"
	"github.com/esanwu-bot/MyDrew/server/internal/search"
	"github.com/esanwu-bot/MyDrew/server/internal/store"
	"github.com/gin-gonic/gin"
)

// Server holds API dependencies.
type Server struct {
	router  *gin.Engine
	search  *search.Service
	store   *store.SnapshotStore
}

// New creates a new API server with all routes registered.
func New(svc *search.Service, st *store.SnapshotStore) *Server {
	r := gin.Default()
	s := &Server{router: r, search: svc, store: st}
	s.registerRoutes()
	return s
}

// Run starts the HTTP server on the given address.
func (s *Server) Run(addr string) error {
	return s.router.Run(addr)
}

func (s *Server) registerRoutes() {
	// Health check
	s.router.GET("/health", s.healthCheck)

	// API v1
	v1 := s.router.Group("/api/v1")
	{
		// Search
		v1.POST("/search", s.searchHandler)

		// Snapshots
		v1.POST("/snapshots", s.publishSnapshot)
		v1.GET("/snapshots/:cid", s.getSnapshot)
		v1.GET("/snapshots", s.listSnapshots)
	}
}

func (s *Server) healthCheck(c *gin.Context) {
	volume := 0
	if s.search != nil {
		volume = s.search.Volume()
	}
	c.JSON(http.StatusOK, gin.H{
		"status":        "ok",
		"service":       "drew-search",
		"version":       "0.2.0",
		"index_volume":  volume,
	})
}

// SearchRequest represents a search query.
type SearchRequest struct {
	Query      string   `json:"query" binding:"required"`
	DomainTags []string `json:"domain_tags,omitempty"`
	Framework  string   `json:"framework,omitempty"`
	Limit      int      `json:"limit,omitempty"`
}

func (s *Server) searchHandler(c *gin.Context) {
	var req SearchRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Limit <= 0 || req.Limit > 100 {
		req.Limit = 10
	}

	results, err := s.search.Search(c.Request.Context(), req.Query, req.DomainTags, req.Framework, req.Limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "search failed", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"query":   req.Query,
		"results": results,
		"total":   len(results),
	})
}

// PublishRequest represents a snapshot publish request.
type PublishRequest struct {
	Content string `json:"content" binding:"required"`
}

func (s *Server) publishSnapshot(c *gin.Context) {
	var req PublishRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	snapshot, err := parser.Parse(req.Content)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid .amd format", "details": err.Error()})
		return
	}

	// Index: store in PostgreSQL + vectorize + store in Qdrant
	if err := s.search.IndexSnapshot(c.Request.Context(), snapshot); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "indexing failed", "details": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message":     "snapshot indexed successfully",
		"task_cid":    snapshot.Frontmatter.TaskCID,
		"steps":       len(snapshot.Body.Steps),
		"domain_tags": snapshot.Frontmatter.DomainTags,
	})
}

func (s *Server) getSnapshot(c *gin.Context) {
	cid := c.Param("cid")
	snap, err := s.store.GetByCID(c.Request.Context(), cid)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "snapshot not found", "task_cid": cid})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"task_cid":    snap.Frontmatter.TaskCID,
		"ref_agent_id": snap.Frontmatter.RefAgentID,
		"branch_tag":  snap.Frontmatter.BranchTag,
		"domain_tags": snap.Frontmatter.DomainTags,
		"framework":   snap.Frontmatter.ExecutionFramework,
		"success_rate": snap.Frontmatter.SuccessRateEst,
		"task_goal":   snap.Body.TaskGoal,
		"steps":       snap.Body.Steps,
		"step_count":  len(snap.Body.Steps),
	})
}

func (s *Server) listSnapshots(c *gin.Context) {
	limit := 10
	if v := c.Query("limit"); v != "" {
		if n := parseInt(v); n > 0 && n <= 100 {
			limit = n
		}
	}
	offset := 0
	if v := c.Query("offset"); v != "" {
		offset = parseInt(v)
	}

	filter := store.ListFilter{
		Limit:  limit,
		Offset: offset,
	}
	if tags := c.QueryArray("domain_tags"); len(tags) > 0 {
		filter.DomainTags = tags
	}
	if fw := c.Query("framework"); fw != "" {
		filter.Framework = fw
	}

	snaps, total, err := s.store.List(c.Request.Context(), filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "list failed", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"snapshots": snaps,
		"total":     total,
		"limit":     limit,
		"offset":    offset,
	})
}

func parseInt(s string) int {
	n := 0
	for _, c := range s {
		if c < '0' || c > '9' {
			return 0
		}
		n = n*10 + int(c-'0')
	}
	return n
}
