-- Drew Search - PostgreSQL Schema
-- Sprint 1-2: Core snapshot storage tables

-- Snapshots table: stores parsed .amd frontmatter metadata
CREATE TABLE IF NOT EXISTS snapshots (
    task_cid        TEXT PRIMARY KEY,
    ref_agent_id    TEXT NOT NULL,
    parent_cid      TEXT REFERENCES snapshots(task_cid) ON DELETE SET NULL,
    branch_tag      TEXT NOT NULL DEFAULT 'main',
    timestamp       TIMESTAMPTZ NOT NULL,

    -- Runtime constraints
    domain_tags     TEXT[] NOT NULL DEFAULT '{}',
    execution_framework TEXT NOT NULL DEFAULT 'Custom',
    base_model_tier TEXT NOT NULL DEFAULT 'LLM-Tier-2',
    data_sovereignty TEXT NOT NULL DEFAULT 'Cloud_Allowed',

    -- I/O contracts (stored as JSONB for flexible querying)
    input_contract  JSONB NOT NULL DEFAULT '{}',
    output_contract JSONB NOT NULL DEFAULT '{}',

    -- Performance & economy
    success_rate_est REAL NOT NULL DEFAULT 0.0,
    avg_token_cost  INTEGER NOT NULL DEFAULT 0,
    split_protocol  JSONB NOT NULL DEFAULT '{"Original_Share": 1.0, "Branch_Share": 0.0}',

    -- Body (raw markdown + parsed structure)
    task_goal       TEXT NOT NULL DEFAULT '',
    body_json       JSONB NOT NULL DEFAULT '{}',
    raw_markdown    TEXT NOT NULL DEFAULT '',

    -- Blueprint Parser compile cache (Sprint 7-8)
    stategraph_json JSONB,
    compiled_at     TIMESTAMPTZ,

    -- Metadata
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    verified        BOOLEAN NOT NULL DEFAULT FALSE,
    deprecated      BOOLEAN NOT NULL DEFAULT FALSE
);

-- Index for domain tag filtering (core search path)
CREATE INDEX IF NOT EXISTS idx_snapshots_domain_tags ON snapshots USING GIN (domain_tags);

-- Index for branch traversal
CREATE INDEX IF NOT EXISTS idx_snapshots_parent_cid ON snapshots (parent_cid);

-- Index for agent lookup
CREATE INDEX IF NOT EXISTS idx_snapshots_ref_agent_id ON snapshots (ref_agent_id);

-- Index for time-based sorting
CREATE INDEX IF NOT EXISTS idx_snapshots_timestamp ON snapshots (timestamp DESC);

-- Index for framework filtering
CREATE INDEX IF NOT EXISTS idx_snapshots_framework ON snapshots (execution_framework);

-- AgentRank cold start: index for structural completeness (step count)
CREATE INDEX IF NOT EXISTS idx_snapshots_success_rate ON snapshots (success_rate_est DESC);

-- Snapshot usage tracking (for AgentRank ReuseCount)
CREATE TABLE IF NOT EXISTS snapshot_usage (
    id              BIGSERIAL PRIMARY KEY,
    snapshot_cid    TEXT NOT NULL REFERENCES snapshots(task_cid) ON DELETE CASCADE,
    used_by_agent   TEXT NOT NULL,
    used_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    success         BOOLEAN NOT NULL DEFAULT TRUE,
    token_saved     INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_usage_snapshot_cid ON snapshot_usage (snapshot_cid);
CREATE INDEX IF NOT EXISTS idx_usage_used_at ON snapshot_usage (used_at DESC);
