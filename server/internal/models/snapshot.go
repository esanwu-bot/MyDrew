// Package models defines the data structures for .amd (Agent Markdown) task snapshots.
// These models map directly to the YAML Frontmatter and Markdown Body sections
// of the .amd file format specification V1.0.
package models

import "time"

// AMDSnapshot represents a complete .amd task snapshot, including both
// the structured Frontmatter metadata and the parsed Markdown body.
type AMDSnapshot struct {
	Frontmatter Frontmatter `json:"frontmatter" yaml:"frontmatter"`
	Body        Body        `json:"body"`
	RawMarkdown string      `json:"raw_markdown"`
}

// Frontmatter contains the four categories of metadata defined in the .amd spec:
// 1. Identification & Versioning
// 2. Runtime Constraints
// 3. Interface Contracts
// 4. Performance & Economy
type Frontmatter struct {
	// === 1. IDENTIFICATION & VERSIONING ===
	TaskCID     string `json:"task_cid" yaml:"Task_CID"`
	RefAgentID  string `json:"ref_agent_id" yaml:"Ref_Agent_ID"`
	ParentCID   string `json:"parent_cid,omitempty" yaml:"Parent_CID,omitempty"`
	BranchTag   string `json:"branch_tag" yaml:"Branch_Tag"`
	Timestamp   string `json:"timestamp" yaml:"Timestamp"`

	// === 2. RUNTIME CONSTRAINTS ===
	DomainTags           []string `json:"domain_tags" yaml:"Domain_Tags"`
	ExecutionFramework   string   `json:"execution_framework" yaml:"Execution_Framework"`
	BaseModelTier        string   `json:"base_model_tier" yaml:"Base_Model_Tier"`
	DataSovereignty      string   `json:"data_sovereignty" yaml:"Data_Sovereignty"`

	// === 3. INTERFACE CONTRACTS ===
	InputContract  Contract `json:"input_contract" yaml:"Input_Contract"`
	OutputContract Contract `json:"output_contract" yaml:"Output_Contract"`

	// === 4. PERFORMANCE & ECONOMY ===
	SuccessRateEst float64       `json:"success_rate_est" yaml:"Success_Rate_Est"`
	AvgTokenCost   int           `json:"avg_token_cost" yaml:"Avg_Token_Cost"`
	SplitProtocol  SplitProtocol `json:"split_protocol" yaml:"Split_Protocol"`
}

// Contract defines the I/O schema contract for a task snapshot.
type Contract struct {
	Type       string      `json:"type" yaml:"Type"`
	SchemaHash string      `json:"schema_hash,omitempty" yaml:"Schema_Hash,omitempty"`
	Sample     interface{} `json:"sample,omitempty" yaml:"Sample,omitempty"`
}

// SplitProtocol defines the revenue split ratio between original and branch authors.
type SplitProtocol struct {
	OriginalShare float64 `json:"original_share" yaml:"Original_Share"`
	BranchShare   float64 `json:"branch_share" yaml:"Branch_Share"`
}

// Body represents the parsed Markdown body of an .amd snapshot.
type Body struct {
	TaskGoal   string       `json:"task_goal"`
	Steps      []Step       `json:"steps"`
	PatchNotes string       `json:"patch_notes,omitempty"`
}

// Step represents a single step in the Chain of Thought & Action Trajectory.
type Step struct {
	Index       int       `json:"index"`
	Title       string    `json:"title"`
	CoT         string    `json:"cot"`
	ToolCall    *ToolCall `json:"tool_call,omitempty"`
}

// ToolCall represents a tool invocation within a step.
type ToolCall struct {
	Name               string      `json:"name"`
	Args               interface{} `json:"args"`
	ResponseMockSchema interface{} `json:"response_mock_schema,omitempty"`
}

// ParsedTime returns the parsed timestamp or zero time if invalid.
func (f *Frontmatter) ParsedTime() time.Time {
	t, err := time.Parse(time.RFC3339, f.Timestamp)
	if err != nil {
		return time.Time{}
	}
	return t
}
