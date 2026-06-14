// Command gentest generates 1000+ simulated .amd snapshots for testing.
// It produces realistic data across 12 domain categories with varying quality levels.
//
// Usage:
//
//	go run ./cmd/gentest -count 1000 -output ../testdata/generated
package main

import (
	"flag"
	"fmt"
	"math/rand"
	"os"
	"path/filepath"
	"time"
)

// Domain categories and their tags
var domains = [][]string{
	{"WMS", "Warehouse", "Inventory"},
	{"TMS", "Transport", "Logistics"},
	{"ERP", "Finance", "Accounting"},
	{"CRM", "Sales", "Marketing"},
	{"DevOps", "CI-CD", "Deployment"},
	{"ML", "Data-Science", "Training"},
	{"Security", "Compliance", "Audit"},
	{"API-Integration", "Microservices", "Backend"},
	{"Data-Pipeline", "ETL", "Analytics"},
	{"Frontend", "UI-UX", "Web"},
	{"Mobile", "iOS", "Android"},
	{"IoT", "Edge-Computing", "Sensors"},
}

var frameworks = []string{"LangGraph", "CrewAI", "AutoGen", "Dify", "Custom"}
var modelTiers = []string{"LLM-Tier-1", "LLM-Tier-2", "LLM-Tier-3"}
var branchTags = []string{"main", "patch", "feature", "hotfix", "experimental"}
var toolNames = []string{"http_request", "code_execute", "shell_execute", "database_query", "file_read", "file_write", "parallel_http_request", "report_generate"}

var taskGoals = []string{
	"Fetch and transform data from external API with error handling and retry logic",
	"Process batch records through a validation pipeline with quality checks",
	"Synchronize state between two microservices with conflict resolution",
	"Generate analytical report from raw data with trend analysis",
	"Automate deployment workflow with rollback capability",
	"Parse and classify incoming documents using ML model",
	"Monitor system health metrics and trigger alerts on anomalies",
	"Orchestrate multi-step approval workflow with escalation",
	"Build data pipeline for real-time event processing",
	"Integrate third-party payment gateway with reconciliation",
	"Migrate legacy data to new schema with validation",
	"Perform security audit on API endpoints and generate compliance report",
	"Train and evaluate classification model on customer feedback data",
	"Optimize query performance with index analysis and caching layer",
	"Implement rate limiter with token bucket algorithm",
}

var stepTitles = []string{
	"Initialize connection and authenticate",
	"Fetch source data with pagination",
	"Validate and clean input records",
	"Apply business transformation rules",
	"Execute core processing logic",
	"Handle edge cases and error recovery",
	"Store results in target system",
	"Generate execution report",
	"Run post-processing verification",
	"Notify stakeholders of completion",
	"Cache intermediate results",
	"Retry failed operations with backoff",
	"Aggregate metrics for monitoring",
	"Validate output against schema",
	"Clean up temporary resources",
}

func main() {
	count := flag.Int("count", 1000, "number of snapshots to generate")
	output := flag.String("output", "../testdata/generated", "output directory")
	flag.Parse()

	if err := os.MkdirAll(*output, 0o755); err != nil {
		fmt.Fprintf(os.Stderr, "failed to create output dir: %v\n", err)
		os.Exit(1)
	}

	rng := rand.New(rand.NewSource(time.Now().UnixNano()))

	for i := 0; i < *count; i++ {
		content := generateSnapshot(rng, i)
		filename := fmt.Sprintf("snapshot_%04d.amd", i)
		path := filepath.Join(*output, filename)
		if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
			fmt.Fprintf(os.Stderr, "failed to write %s: %v\n", path, err)
			os.Exit(1)
		}
	}

	fmt.Printf("Generated %d snapshots in %s\n", *count, *output)
}

func generateSnapshot(rng *rand.Rand, idx int) string {
	domain := domains[rng.Intn(len(domains))]
	framework := frameworks[rng.Intn(len(frameworks))]
	modelTier := modelTiers[rng.Intn(len(modelTiers))]
	branchTag := branchTags[rng.Intn(len(branchTags))]
	successRate := 0.5 + rng.Float64()*0.5 // 0.5 to 1.0
	tokenCost := 1000 + rng.Intn(5000)
	stepCount := 2 + rng.Intn(8) // 2 to 9 steps

	// Generate timestamp spread across 2026
	day := 1 + rng.Intn(150)
	hour := rng.Intn(24)
	minute := rng.Intn(60)
	ts := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC).
		Add(time.Duration(day)*24*time.Hour + time.Duration(hour)*time.Hour + time.Duration(minute)*time.Minute)

	cid := fmt.Sprintf("gen-%s-%04d", domain[0], idx)
	agentID := fmt.Sprintf("agent-%03d", rng.Intn(200))

	// Build tags YAML
	tagsYAML := ""
	for _, t := range domain {
		tagsYAML += fmt.Sprintf("  - \"%s\"\n", t)
	}
	// Add 0-2 random extra tags
	extraTags := rng.Intn(3)
	allTags := flattenDomains(domains)
	for j := 0; j < extraTags; j++ {
		t := allTags[rng.Intn(len(allTags))]
		tagsYAML += fmt.Sprintf("  - \"%s\"\n", t)
	}

	// Build steps
	steps := ""
	for s := 0; s < stepCount; s++ {
		title := stepTitles[rng.Intn(len(stepTitles))]
		tool := toolNames[rng.Intn(len(toolNames))]
		steps += fmt.Sprintf(`
### Step %d: %s
**CoT**: This step handles %s as part of the overall workflow.
`+"```tool_call"+`
name: %s
args:
  param_%d: "value_%d"
  operation: "%s"
response_mock_schema:
  result: "object"
`+"```"+`
`, s+1, title, title, tool, s, idx, title)
	}

	goal := taskGoals[rng.Intn(len(taskGoals))]

	return fmt.Sprintf(`---
Task_CID: "%s"
Ref_Agent_ID: "%s"
Branch_Tag: "%s"
Timestamp: "%s"
Domain_Tags:
%sExecution_Framework: "%s"
Base_Model_Tier: "%s"
Data_Sovereignty: "Cloud_Allowed"
Input_Contract:
  Type: "JSON"
  Schema_Hash: "sha256:%s-in"
  Sample:
    input_key: "input_value"
Output_Contract:
  Type: "JSON"
  Schema_Hash: "sha256:%s-out"
  Sample:
    output_key: "output_value"
Success_Rate_Est: %.2f
Avg_Token_Cost: %d
Split_Protocol:
  Original_Share: 1.0
  Branch_Share: 0.0
---

## Task Goal
%s

## Chain of Thought & Action Trajectory
%s
## Patch Notes
Generated test snapshot for %s domain.
`, cid, agentID, branchTag, ts.Format(time.RFC3339),
		tagsYAML, framework, modelTier,
		cid, cid, successRate, tokenCost,
		goal, steps, domain[0])
}

func flattenDomains(domains [][]string) []string {
	var all []string
	for _, d := range domains {
		all = append(all, d...)
	}
	return all
}
