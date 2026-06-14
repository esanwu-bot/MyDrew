package parser

import (
	"os"
	"testing"
)

func TestParseSampleAMD(t *testing.T) {
	data, err := os.ReadFile("../../testdata/sample.amd")
	if err != nil {
		t.Fatalf("failed to read sample.amd: %v", err)
	}

	snapshot, err := Parse(string(data))
	if err != nil {
		t.Fatalf("Parse() error: %v", err)
	}

	// === Frontmatter assertions ===
	fm := snapshot.Frontmatter

	if fm.TaskCID != "bafybeic2cfq7test001" {
		t.Errorf("TaskCID = %q, want %q", fm.TaskCID, "bafybeic2cfq7test001")
	}
	if fm.RefAgentID != "agent://bafybeihktestagent01" {
		t.Errorf("RefAgentID = %q, want %q", fm.RefAgentID, "agent://bafybeihktestagent01")
	}
	if fm.BranchTag != "main" {
		t.Errorf("BranchTag = %q, want %q", fm.BranchTag, "main")
	}
	if fm.Timestamp != "2026-06-12T16:00:00Z" {
		t.Errorf("Timestamp = %q, want %q", fm.Timestamp, "2026-06-12T16:00:00Z")
	}
	if len(fm.DomainTags) != 3 {
		t.Errorf("DomainTags length = %d, want 3", len(fm.DomainTags))
	}
	if fm.ExecutionFramework != "Eino" {
		t.Errorf("ExecutionFramework = %q, want %q", fm.ExecutionFramework, "Eino")
	}
	if fm.BaseModelTier != "LLM-Tier-1" {
		t.Errorf("BaseModelTier = %q, want %q", fm.BaseModelTier, "LLM-Tier-1")
	}
	if fm.DataSovereignty != "Local_Strict" {
		t.Errorf("DataSovereignty = %q, want %q", fm.DataSovereignty, "Local_Strict")
	}
	if fm.InputContract.Type != "application/json" {
		t.Errorf("InputContract.Type = %q, want %q", fm.InputContract.Type, "application/json")
	}
	if fm.InputContract.SchemaHash != "sha256-a9f8e001" {
		t.Errorf("InputContract.SchemaHash = %q, want %q", fm.InputContract.SchemaHash, "sha256-a9f8e001")
	}
	if fm.SuccessRateEst != 0.98 {
		t.Errorf("SuccessRateEst = %f, want 0.98", fm.SuccessRateEst)
	}
	if fm.AvgTokenCost != 12500 {
		t.Errorf("AvgTokenCost = %d, want 12500", fm.AvgTokenCost)
	}
	if fm.SplitProtocol.OriginalShare != 0.60 {
		t.Errorf("SplitProtocol.OriginalShare = %f, want 0.60", fm.SplitProtocol.OriginalShare)
	}
	if fm.SplitProtocol.BranchShare != 0.40 {
		t.Errorf("SplitProtocol.BranchShare = %f, want 0.40", fm.SplitProtocol.BranchShare)
	}

	// === Body assertions ===
	body := snapshot.Body

	if body.TaskGoal == "" {
		t.Error("TaskGoal is empty, expected non-empty")
	}

	if len(body.Steps) != 2 {
		t.Fatalf("Steps length = %d, want 2", len(body.Steps))
	}

	// Step 1
	s1 := body.Steps[0]
	if s1.Index != 1 {
		t.Errorf("Step[0].Index = %d, want 1", s1.Index)
	}
	if s1.Title != "Context Gathering" {
		t.Errorf("Step[0].Title = %q, want %q", s1.Title, "Context Gathering")
	}
	if s1.CoT == "" {
		t.Error("Step[0].CoT is empty, expected non-empty")
	}
	if s1.ToolCall == nil {
		t.Fatal("Step[0].ToolCall is nil, expected non-nil")
	}
	if s1.ToolCall.Name != "sqlite_local_query" {
		t.Errorf("Step[0].ToolCall.Name = %q, want %q", s1.ToolCall.Name, "sqlite_local_query")
	}

	// Step 2
	s2 := body.Steps[1]
	if s2.Index != 2 {
		t.Errorf("Step[1].Index = %d, want 2", s2.Index)
	}
	if s2.Title != "API Gateway Bridge" {
		t.Errorf("Step[1].Title = %q, want %q", s2.Title, "API Gateway Bridge")
	}
	if s2.ToolCall == nil {
		t.Fatal("Step[1].ToolCall is nil, expected non-nil")
	}
	if s2.ToolCall.Name != "local_shim_wms_post" {
		t.Errorf("Step[1].ToolCall.Name = %q, want %q", s2.ToolCall.Name, "local_shim_wms_post")
	}

	// Patch notes
	if body.PatchNotes == "" {
		t.Error("PatchNotes is empty, expected non-empty")
	}
}

func TestParseEmpty(t *testing.T) {
	_, err := Parse("")
	if err == nil {
		t.Error("Parse(\"\") should return error")
	}
}

func TestParseNoFrontmatter(t *testing.T) {
	_, err := Parse("# Just a markdown heading\nNo frontmatter here.")
	if err == nil {
		t.Error("Parse without frontmatter should return error")
	}
}

func TestParseMinimalAMD(t *testing.T) {
	content := `---
Task_CID: "test-minimal-001"
Ref_Agent_ID: "agent://test"
Branch_Tag: "main"
Timestamp: "2026-01-01T00:00:00Z"
Domain_Tags: ["Test"]
Execution_Framework: "Custom"
Base_Model_Tier: "LLM-Tier-2"
Data_Sovereignty: "Cloud_Allowed"
Input_Contract:
  Type: "text/plain"
Output_Contract:
  Type: "text/plain"
Success_Rate_Est: 0.5
Avg_Token_Cost: 1000
Split_Protocol:
  Original_Share: 1.0
  Branch_Share: 0.0
---

# Task Goal
A minimal test task.

## [Step 1: Init]
### CoT (思考过程)
Initialize the system.
`
	snapshot, err := Parse(content)
	if err != nil {
		t.Fatalf("Parse() error: %v", err)
	}
	if snapshot.Frontmatter.TaskCID != "test-minimal-001" {
		t.Errorf("TaskCID = %q, want %q", snapshot.Frontmatter.TaskCID, "test-minimal-001")
	}
	if len(snapshot.Body.Steps) != 1 {
		t.Errorf("Steps length = %d, want 1", len(snapshot.Body.Steps))
	}
	if snapshot.Body.TaskGoal != "A minimal test task." {
		t.Errorf("TaskGoal = %q, want %q", snapshot.Body.TaskGoal, "A minimal test task.")
	}
}
