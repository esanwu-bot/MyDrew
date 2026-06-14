// Package embedding provides a client for the BGE-M3 embedding microservice.
package embedding

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// Client calls the embedding microservice to generate dense vectors.
type Client struct {
	baseURL    string
	httpClient *http.Client
}

// NewClient creates a new embedding client.
func NewClient(url string, timeoutMs int) *Client {
	return &Client{
		baseURL: url,
		httpClient: &http.Client{
			Timeout: time.Duration(timeoutMs) * time.Millisecond,
		},
	}
}

// EmbedRequest is the request body for the embedding service.
type EmbedRequest struct {
	Texts []string `json:"texts"`
}

// EmbedResponse is the response body from the embedding service.
type EmbedResponse struct {
	Embeddings [][]float32 `json:"embeddings"`
	Model      string      `json:"model"`
	Dimension  int         `json:"dimension"`
}

// Embed returns dense vectors for the given texts.
func (c *Client) Embed(ctx context.Context, texts []string) (*EmbedResponse, error) {
	reqBody, err := json.Marshal(EmbedRequest{Texts: texts})
	if err != nil {
		return nil, fmt.Errorf("marshal embed request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		c.baseURL+"/embed", bytes.NewReader(reqBody))
	if err != nil {
		return nil, fmt.Errorf("create embed request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("embed request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("embed service error (%d): %s", resp.StatusCode, string(body))
	}

	var result EmbedResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("decode embed response: %w", err)
	}
	return &result, nil
}

// EmbedSingle returns a dense vector for a single text.
func (c *Client) EmbedSingle(ctx context.Context, text string) ([]float32, error) {
	resp, err := c.Embed(ctx, []string{text})
	if err != nil {
		return nil, err
	}
	if len(resp.Embeddings) == 0 {
		return nil, fmt.Errorf("empty embedding response")
	}
	return resp.Embeddings[0], nil
}
