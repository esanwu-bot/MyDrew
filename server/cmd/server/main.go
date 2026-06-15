// Drew Search - Distributed Agent Trajectory Search Engine
// Main entry point for the Go API server.
package main

import (
	"database/sql"
	"fmt"
	"log"

	_ "github.com/lib/pq"

	"github.com/esanwu-bot/MyDrew/server/internal/api"
	"github.com/esanwu-bot/MyDrew/server/internal/config"
	"github.com/esanwu-bot/MyDrew/server/internal/embedding"
	"github.com/esanwu-bot/MyDrew/server/internal/search"
	"github.com/esanwu-bot/MyDrew/server/internal/store"
	"github.com/esanwu-bot/MyDrew/server/internal/vectorstore"
)

func main() {
	cfg := config.Load()

	log.Printf("Drew Search Server v0.2.0 starting...")
	log.Printf("  Database:  %s:%s/%s", cfg.Database.Host, cfg.Database.Port, cfg.Database.DBName)
	log.Printf("  Qdrant:    %s:%s (collection: %s, dim: %d)",
		cfg.Qdrant.Host, cfg.Qdrant.HTTPPort, cfg.Qdrant.Collection, cfg.Qdrant.VectorSize)
	log.Printf("  Embedding: %s (model: %s)", cfg.Embedding.URL, cfg.Embedding.Model)

	// 1. Connect to PostgreSQL
	db, err := sql.Open("postgres", cfg.Database.DSN())
	if err != nil {
		log.Fatalf("Failed to open database: %v", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatalf("Failed to ping database: %v", err)
	}
	log.Printf("  PostgreSQL connected")

	// 2. Initialize stores and clients
	snapshotStore := store.NewSnapshotStore(db)
	qdrantClient := vectorstore.NewQdrantClient(
		cfg.Qdrant.Host, cfg.Qdrant.HTTPPort,
		cfg.Qdrant.Collection, cfg.Qdrant.VectorSize,
	)
	embeddingClient := embedding.NewClient(cfg.Embedding.URL, cfg.Embedding.TimeoutMs)

	// 3. Create search service (initializes Qdrant collection)
	searchService := search.NewService(snapshotStore, qdrantClient, embeddingClient)
	log.Printf("  Search service initialized (index volume: %d)", searchService.Volume())

	// 4. Start API server
	server := api.New(searchService, snapshotStore)

	addr := fmt.Sprintf("%s:%s", cfg.Server.Host, cfg.Server.Port)
	log.Printf("  Listening on %s", addr)

	if err := server.Run(addr); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
