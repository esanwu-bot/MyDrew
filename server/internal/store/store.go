// Package store provides the PostgreSQL-backed persistence layer for Drew snapshots.
package store

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/drew-search/drew-server/internal/models"
)

// SnapshotStore handles snapshot persistence and retrieval.
type SnapshotStore struct {
	db *sql.DB
}

// NewSnapshotStore creates a new SnapshotStore backed by the given database.
func NewSnapshotStore(db *sql.DB) *SnapshotStore {
	return &SnapshotStore{db: db}
}

// Upsert inserts or updates a snapshot in the database.
func (s *SnapshotStore) Upsert(ctx context.Context, snap *models.AMDSnapshot) error {
	inputContract, err := json.Marshal(snap.Frontmatter.InputContract)
	if err != nil {
		return fmt.Errorf("marshal input contract: %w", err)
	}
	outputContract, err := json.Marshal(snap.Frontmatter.OutputContract)
	if err != nil {
		return fmt.Errorf("marshal output contract: %w", err)
	}
	splitProtocol, err := json.Marshal(snap.Frontmatter.SplitProtocol)
	if err != nil {
		return fmt.Errorf("marshal split protocol: %w", err)
	}
	bodyJSON, err := json.Marshal(snap.Body)
	if err != nil {
		return fmt.Errorf("marshal body: %w", err)
	}

	ts, err := time.Parse(time.RFC3339, snap.Frontmatter.Timestamp)
	if err != nil {
		ts = time.Now()
	}

	query := `
		INSERT INTO snapshots (
			task_cid, ref_agent_id, parent_cid, branch_tag, timestamp,
			domain_tags, execution_framework, base_model_tier, data_sovereignty,
			input_contract, output_contract,
			success_rate_est, avg_token_cost, split_protocol,
			task_goal, body_json, raw_markdown,
			created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5,
			$6, $7, $8, $9,
			$10, $11,
			$12, $13, $14,
			$15, $16, $17,
			NOW(), NOW()
		)
		ON CONFLICT (task_cid) DO UPDATE SET
			ref_agent_id = EXCLUDED.ref_agent_id,
			parent_cid = EXCLUDED.parent_cid,
			branch_tag = EXCLUDED.branch_tag,
			timestamp = EXCLUDED.timestamp,
			domain_tags = EXCLUDED.domain_tags,
			execution_framework = EXCLUDED.execution_framework,
			base_model_tier = EXCLUDED.base_model_tier,
			data_sovereignty = EXCLUDED.data_sovereignty,
			input_contract = EXCLUDED.input_contract,
			output_contract = EXCLUDED.output_contract,
			success_rate_est = EXCLUDED.success_rate_est,
			avg_token_cost = EXCLUDED.avg_token_cost,
			split_protocol = EXCLUDED.split_protocol,
			task_goal = EXCLUDED.task_goal,
			body_json = EXCLUDED.body_json,
			raw_markdown = EXCLUDED.raw_markdown,
			updated_at = NOW()
	`

	parentCID := sql.NullString{String: snap.Frontmatter.ParentCID, Valid: snap.Frontmatter.ParentCID != ""}

	_, err = s.db.ExecContext(ctx, query,
		snap.Frontmatter.TaskCID,
		snap.Frontmatter.RefAgentID,
		parentCID,
		snap.Frontmatter.BranchTag,
		ts,
		pqStringArray(snap.Frontmatter.DomainTags),
		snap.Frontmatter.ExecutionFramework,
		snap.Frontmatter.BaseModelTier,
		snap.Frontmatter.DataSovereignty,
		inputContract,
		outputContract,
		snap.Frontmatter.SuccessRateEst,
		snap.Frontmatter.AvgTokenCost,
		splitProtocol,
		snap.Body.TaskGoal,
		bodyJSON,
		snap.RawMarkdown,
	)
	return err
}

// GetByCID retrieves a snapshot by its Task_CID.
func (s *SnapshotStore) GetByCID(ctx context.Context, cid string) (*models.AMDSnapshot, error) {
	query := `
		SELECT task_cid, ref_agent_id, COALESCE(parent_cid, ''), branch_tag, timestamp,
			domain_tags, execution_framework, base_model_tier, data_sovereignty,
			input_contract, output_contract,
			success_rate_est, avg_token_cost, split_protocol,
			task_goal, body_json, raw_markdown, verified, deprecated
		FROM snapshots WHERE task_cid = $1
	`

	row := s.db.QueryRowContext(ctx, query, cid)
	return scanSnapshot(row)
}

// List returns a paginated list of snapshots with optional filters.
func (s *SnapshotStore) List(ctx context.Context, filter ListFilter) ([]*models.AMDSnapshot, int, error) {
	var conditions []string
	var args []interface{}
	argIdx := 1

	if len(filter.DomainTags) > 0 {
		conditions = append(conditions, fmt.Sprintf("domain_tags && $%d", argIdx))
		args = append(args, pqStringArray(filter.DomainTags))
		argIdx++
	}
	if filter.Framework != "" {
		conditions = append(conditions, fmt.Sprintf("execution_framework = $%d", argIdx))
		args = append(args, filter.Framework)
		argIdx++
	}
	if filter.VerifiedOnly {
		conditions = append(conditions, "verified = true")
	}
	if !filter.IncludeDeprecated {
		conditions = append(conditions, "deprecated = false")
	}

	where := ""
	if len(conditions) > 0 {
		where = "WHERE " + strings.Join(conditions, " AND ")
	}

	// Count query
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM snapshots %s", where)
	var total int
	if err := s.db.QueryRowContext(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count snapshots: %w", err)
	}

	// Data query
	offset := filter.Offset
	if offset < 0 {
		offset = 0
	}
	limit := filter.Limit
	if limit <= 0 || limit > 100 {
		limit = 10
	}

	dataQuery := fmt.Sprintf(`
		SELECT task_cid, ref_agent_id, COALESCE(parent_cid, ''), branch_tag, timestamp,
			domain_tags, execution_framework, base_model_tier, data_sovereignty,
			input_contract, output_contract,
			success_rate_est, avg_token_cost, split_protocol,
			task_goal, body_json, raw_markdown, verified, deprecated
		FROM snapshots %s
		ORDER BY timestamp DESC
		LIMIT $%d OFFSET $%d
	`, where, argIdx, argIdx+1)
	args = append(args, limit, offset)

	rows, err := s.db.QueryContext(ctx, dataQuery, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("list snapshots: %w", err)
	}
	defer rows.Close()

	var results []*models.AMDSnapshot
	for rows.Next() {
		snap, err := scanSnapshotRow(rows)
		if err != nil {
			return nil, 0, err
		}
		results = append(results, snap)
	}
	return results, total, nil
}

// GetUsageCount returns the reuse count for a snapshot.
func (s *SnapshotStore) GetUsageCount(ctx context.Context, cid string) (int, error) {
	var count int
	err := s.db.QueryRowContext(ctx,
		"SELECT COUNT(*) FROM snapshot_usage WHERE snapshot_cid = $1 AND success = true", cid,
	).Scan(&count)
	return count, err
}

// RecordUsage records a snapshot usage event.
func (s *SnapshotStore) RecordUsage(ctx context.Context, cid, agentID string, tokenSaved int, success bool) error {
	_, err := s.db.ExecContext(ctx,
		`INSERT INTO snapshot_usage (snapshot_cid, used_by_agent, success, token_saved)
		 VALUES ($1, $2, $3, $4)`,
		cid, agentID, success, tokenSaved,
	)
	return err
}

// SearchCandidates returns snapshots matching scalar filters for hybrid search.
func (s *SnapshotStore) SearchCandidates(ctx context.Context, filter SearchFilter) ([]*models.AMDSnapshot, error) {
	var conditions []string
	var args []interface{}
	argIdx := 1

	if len(filter.DomainTags) > 0 {
		conditions = append(conditions, fmt.Sprintf("domain_tags && $%d", argIdx))
		args = append(args, pqStringArray(filter.DomainTags))
		argIdx++
	}
	if filter.Framework != "" {
		conditions = append(conditions, fmt.Sprintf("execution_framework = $%d", argIdx))
		args = append(args, filter.Framework)
		argIdx++
	}
	if filter.MinSuccessRate > 0 {
		conditions = append(conditions, fmt.Sprintf("success_rate_est >= $%d", argIdx))
		args = append(args, filter.MinSuccessRate)
		argIdx++
	}

	where := "WHERE deprecated = false"
	if len(conditions) > 0 {
		where += " AND " + strings.Join(conditions, " AND ")
	}

	limit := filter.Limit
	if limit <= 0 {
		limit = 50
	}

	query := fmt.Sprintf(`
		SELECT task_cid, ref_agent_id, COALESCE(parent_cid, ''), branch_tag, timestamp,
			domain_tags, execution_framework, base_model_tier, data_sovereignty,
			input_contract, output_contract,
			success_rate_est, avg_token_cost, split_protocol,
			task_goal, body_json, raw_markdown, verified, deprecated
		FROM snapshots %s
		ORDER BY timestamp DESC
		LIMIT $%d
	`, where, argIdx)
	args = append(args, limit)

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("search candidates: %w", err)
	}
	defer rows.Close()

	var results []*models.AMDSnapshot
	for rows.Next() {
		snap, err := scanSnapshotRow(rows)
		if err != nil {
			return nil, err
		}
		results = append(results, snap)
	}
	return results, nil
}

// StepCount returns the number of steps in a snapshot's body (for structural completeness).
func (s *SnapshotStore) StepCount(ctx context.Context, cid string) (int, error) {
	var count int
	err := s.db.QueryRowContext(ctx,
		"SELECT jsonb_array_length(COALESCE(body_json->'steps', '[]'::jsonb)) FROM snapshots WHERE task_cid = $1",
		cid,
	).Scan(&count)
	return count, err
}

// ListFilter defines filtering options for List.
type ListFilter struct {
	DomainTags        []string
	Framework         string
	VerifiedOnly      bool
	IncludeDeprecated bool
	Limit             int
	Offset            int
}

// SearchFilter defines filtering options for hybrid search scalar pre-filter.
type SearchFilter struct {
	DomainTags     []string
	Framework      string
	MinSuccessRate float64
	Limit          int
}

// helper: convert []string to PostgreSQL text array literal.
func pqStringArray(ss []string) string {
	if len(ss) == 0 {
		return "{}"
	}
	return "{" + strings.Join(ss, ",") + "}"
}

// scanner interface for row scanning.
type scanner interface {
	Scan(dest ...interface{}) error
}

func scanSnapshot(row *sql.Row) (*models.AMDSnapshot, error) {
	var (
		snap          models.AMDSnapshot
		verified      bool
		deprecated    bool
		inputContract []byte
		outputContract []byte
		splitProtocol []byte
		bodyJSON      []byte
	)

	err := row.Scan(
		&snap.Frontmatter.TaskCID,
		&snap.Frontmatter.RefAgentID,
		&snap.Frontmatter.ParentCID,
		&snap.Frontmatter.BranchTag,
		&snap.Frontmatter.Timestamp,
		pqStringArrayScanner(&snap.Frontmatter.DomainTags),
		&snap.Frontmatter.ExecutionFramework,
		&snap.Frontmatter.BaseModelTier,
		&snap.Frontmatter.DataSovereignty,
		&inputContract,
		&outputContract,
		&snap.Frontmatter.SuccessRateEst,
		&snap.Frontmatter.AvgTokenCost,
		&splitProtocol,
		&snap.Body.TaskGoal,
		&bodyJSON,
		&snap.RawMarkdown,
		&verified,
		&deprecated,
	)
	if err != nil {
		return nil, fmt.Errorf("scan snapshot: %w", err)
	}

	_ = json.Unmarshal(inputContract, &snap.Frontmatter.InputContract)
	_ = json.Unmarshal(outputContract, &snap.Frontmatter.OutputContract)
	_ = json.Unmarshal(splitProtocol, &snap.Frontmatter.SplitProtocol)
	_ = json.Unmarshal(bodyJSON, &snap.Body)

	return &snap, nil
}

func scanSnapshotRow(rows *sql.Rows) (*models.AMDSnapshot, error) {
	var (
		snap          models.AMDSnapshot
		verified      bool
		deprecated    bool
		inputContract []byte
		outputContract []byte
		splitProtocol []byte
		bodyJSON      []byte
	)

	err := rows.Scan(
		&snap.Frontmatter.TaskCID,
		&snap.Frontmatter.RefAgentID,
		&snap.Frontmatter.ParentCID,
		&snap.Frontmatter.BranchTag,
		&snap.Frontmatter.Timestamp,
		pqStringArrayScanner(&snap.Frontmatter.DomainTags),
		&snap.Frontmatter.ExecutionFramework,
		&snap.Frontmatter.BaseModelTier,
		&snap.Frontmatter.DataSovereignty,
		&inputContract,
		&outputContract,
		&snap.Frontmatter.SuccessRateEst,
		&snap.Frontmatter.AvgTokenCost,
		&splitProtocol,
		&snap.Body.TaskGoal,
		&bodyJSON,
		&snap.RawMarkdown,
		&verified,
		&deprecated,
	)
	if err != nil {
		return nil, fmt.Errorf("scan snapshot row: %w", err)
	}

	_ = json.Unmarshal(inputContract, &snap.Frontmatter.InputContract)
	_ = json.Unmarshal(outputContract, &snap.Frontmatter.OutputContract)
	_ = json.Unmarshal(splitProtocol, &snap.Frontmatter.SplitProtocol)
	_ = json.Unmarshal(bodyJSON, &snap.Body)

	return &snap, nil
}

// pqStringArrayScanner scans a PostgreSQL text array into a Go []string.
type pgStringArrayScanner struct {
	dest *[]string
}

func pqStringArrayScanner(dest *[]string) *pgStringArrayScanner {
	return &pgStringArrayScanner{dest: dest}
}

func (s *pgStringArrayScanner) Scan(src interface{}) error {
	if src == nil {
		*s.dest = nil
		return nil
	}
	var raw string
	switch v := src.(type) {
	case []byte:
		raw = string(v)
	case string:
		raw = v
	default:
		return fmt.Errorf("unexpected type for string array: %T", src)
	}

	// Parse {a,b,c} format
	raw = strings.Trim(raw, "{}")
	if raw == "" {
		*s.dest = []string{}
		return nil
	}
	*s.dest = strings.Split(raw, ",")
	return nil
}
