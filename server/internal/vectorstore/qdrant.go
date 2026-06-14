// Package vectorstore provides a client for interacting with Qdrant vector database.
// It handles collection management, point upsert, and vector similarity search.
package vectorstore

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// QdrantClient is a minimal HTTP client for Qdrant REST API.
type QdrantClient struct {
	baseURL    string
	collection string
	vectorSize int
	httpClient *http.Client
}

// NewQdrantClient creates a new Qdrant client.
func NewQdrantClient(host, httpPort, collection string, vectorSize int) *QdrantClient {
	return &QdrantClient{
		baseURL:    fmt.Sprintf("http://%s:%s", host, httpPort),
		collection: collection,
		vectorSize: vectorSize,
		httpClient: &http.Client{Timeout: 10 * time.Second},
	}
}

// EnsureCollection creates the collection if it doesn't exist.
func (q *QdrantClient) EnsureCollection(ctx context.Context) error {
	// Check if collection exists
	resp, err := q.doRequest(ctx, http.MethodGet, fmt.Sprintf("/collections/%s", q.collection), nil)
	if err == nil && resp.StatusCode == http.StatusOK {
		return nil // already exists
	}

	// Create collection
	body := map[string]interface{}{
		"vectors": map[string]interface{}{
			"size":     q.vectorSize,
			"distance": "Cosine",
		},
		"optimizers_config": map[string]interface{}{
			"indexing_threshold": 1000,
		},
	}
	resp, err = q.doRequest(ctx, http.MethodPut, fmt.Sprintf("/collections/%s", q.collection), body)
	if err != nil {
		return fmt.Errorf("create collection: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		b, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("create collection failed (%d): %s", resp.StatusCode, string(b))
	}
	return nil
}

// Point represents a Qdrant point with vector and payload.
type Point struct {
	ID      string                 `json:"id"`
	Vector  []float32              `json:"vector"`
	Payload map[string]interface{} `json:"payload"`
}

// Upsert inserts or updates points in the collection.
func (q *QdrantClient) Upsert(ctx context.Context, points []Point) error {
	body := map[string]interface{}{
		"points": points,
	}

	resp, err := q.doRequest(ctx, http.MethodPut,
		fmt.Sprintf("/collections/%s/points", q.collection), body)
	if err != nil {
		return fmt.Errorf("upsert points: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		b, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("upsert failed (%d): %s", resp.StatusCode, string(b))
	}
	return nil
}

// SearchResult represents a single search hit.
type SearchResult struct {
	ID      string                 `json:"id"`
	Score   float64                `json:"score"`
	Payload map[string]interface{} `json:"payload"`
}

// Search performs a nearest-neighbor vector search with optional payload filter.
func (q *QdrantClient) Search(ctx context.Context, vector []float32, filter map[string]interface{}, limit int) ([]SearchResult, error) {
	body := map[string]interface{}{
		"vector": vector,
		"limit":  limit,
		"with_payload": true,
	}
	if len(filter) > 0 {
		body["filter"] = buildQdrantFilter(filter)
	}

	resp, err := q.doRequest(ctx, http.MethodPost,
		fmt.Sprintf("/collections/%s/points/search", q.collection), body)
	if err != nil {
		return nil, fmt.Errorf("search: %w", err)
	}
	defer resp.Body.Close()

	var result struct {
		Result []SearchResult `json:"result"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("decode search result: %w", err)
	}
	return result.Result, nil
}

// DeletePoint removes a point by ID.
func (q *QdrantClient) DeletePoint(ctx context.Context, id string) error {
	body := map[string]interface{}{
		"points": []string{id},
	}
	resp, err := q.doRequest(ctx, http.MethodPost,
		fmt.Sprintf("/collections/%s/points/delete", q.collection), body)
	if err != nil {
		return fmt.Errorf("delete point: %w", err)
	}
	defer resp.Body.Close()
	return nil
}

func (q *QdrantClient) doRequest(ctx context.Context, method, path string, body interface{}) (*http.Response, error) {
	var bodyReader io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			return nil, err
		}
		bodyReader = bytes.NewReader(b)
	}

	req, err := http.NewRequestWithContext(ctx, method, q.baseURL+path, bodyReader)
	if err != nil {
		return nil, err
	}
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	return q.httpClient.Do(req)
}

// buildQdrantFilter converts a simple filter map into Qdrant filter DSL.
func buildQdrantFilter(filter map[string]interface{}) map[string]interface{} {
	var must []interface{}
	for k, v := range filter {
		switch val := v.(type) {
		case []string:
			if len(val) > 0 {
				must = append(must, map[string]interface{}{
					"key":   k,
					"match": map[string]interface{}{"any": val},
				})
			}
		case string:
			if val != "" {
				must = append(must, map[string]interface{}{
					"key":   k,
					"match": map[string]interface{}{"value": val},
				})
			}
		}
	}
	if len(must) == 0 {
		return nil
	}
	return map[string]interface{}{"must": must}
}
