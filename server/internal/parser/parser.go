// Package parser implements the .amd (Agent Markdown) file format parser.
// It extracts YAML Frontmatter metadata and parses the Markdown Body into
// structured Chain of Thought & Action Trajectory steps.
package parser

import (
	"encoding/json"
	"fmt"
	"regexp"
	"strconv"
	"strings"

	"github.com/drew-search/drew-server/internal/models"
	"gopkg.in/yaml.v3"
)

var (
	// frontmatterRegex matches YAML frontmatter delimited by ---
	frontmatterRegex = regexp.MustCompile(`(?s)^---\s*\n(.*?)\n---\s*\n(.*)$`)

	// stepHeaderRegex matches ## [Step N: Title] or ### Step N: Title
	stepHeaderRegex = regexp.MustCompile(`(?m)^#{2,3}\s+(?:\[Step\s+(\d+)(?::\s*(.+?))?\]|Step\s+(\d+):\s*(.+?))\s*$`)

	// cotRegex matches **CoT**: content or ### CoT section content
	cotRegex = regexp.MustCompile("(?s)(?:\\*\\*CoT\\*\\*:?\\s*|###\\s+CoT\\s*(?:\\(.*?\\))?\\s*\\n)(.*?)(?:\\n```|\\n###\\s+Step|\\n##\\s+\\[Step|\\n#\\s+|$)")

	// toolCallNameRegex matches tool call name (with optional bullet prefix, multiline)
	toolCallNameRegex = regexp.MustCompile("(?m)\\*?\\s*\\*\\*Name:\\*\\*\\s*" + "`?" + `(.+?)` + "`?" + `[^\S\n]*$`)

	// toolCallArgsRegex matches tool call args (JSON in backticks, with optional bullet prefix)
	toolCallArgsRegex = regexp.MustCompile("(?m)\\*?\\s*\\*\\*Args:\\*\\*\\s*" + "`?" + `(.+?)` + "`?" + `[^\S\n]*$`)

	// toolCallResponseRegex matches tool call response mock schema
	toolCallResponseRegex = regexp.MustCompile("(?m)\\*?\\s*\\*\\*Response_Mock_Schema:\\*\\*\\s*" + "`?" + `(.+?)` + "`?" + `[^\S\n]*$`)

	// toolCallBlockRegex matches ```tool_call block format
	toolCallBlockRegex = regexp.MustCompile("(?s)```tool_call\\s*\\n(.*?)\\n```")

	// patchNotesRegex matches the Patch Notes section
	patchNotesRegex = regexp.MustCompile(`(?s)#\s+.*?(?:Patch Notes|分支修订说明|修订说明).*?\n(.*?)(?:\n#\s+|$)`)
)

// Parse parses a raw .amd file content into an AMDSnapshot.
func Parse(content string) (*models.AMDSnapshot, error) {
	if strings.TrimSpace(content) == "" {
		return nil, fmt.Errorf("amd: empty content")
	}

	frontmatter, bodyContent, err := splitFrontmatter(content)
	if err != nil {
		return nil, fmt.Errorf("amd: failed to split frontmatter: %w", err)
	}

	fm, err := parseFrontmatter(frontmatter)
	if err != nil {
		return nil, fmt.Errorf("amd: failed to parse frontmatter: %w", err)
	}

	body, err := parseBody(bodyContent)
	if err != nil {
		return nil, fmt.Errorf("amd: failed to parse body: %w", err)
	}

	return &models.AMDSnapshot{
		Frontmatter: *fm,
		Body:        *body,
		RawMarkdown: content,
	}, nil
}

// splitFrontmatter separates the YAML frontmatter from the Markdown body.
func splitFrontmatter(content string) (string, string, error) {
	matches := frontmatterRegex.FindStringSubmatch(content)
	if matches == nil {
		return "", "", fmt.Errorf("no valid YAML frontmatter found (expected --- delimiters)")
	}
	return matches[1], matches[2], nil
}

// parseFrontmatter parses the YAML frontmatter string into a Frontmatter struct.
func parseFrontmatter(yamlContent string) (*models.Frontmatter, error) {
	var fm models.Frontmatter

	// Use a raw map first to handle the custom key names
	var raw map[string]interface{}
	if err := yaml.Unmarshal([]byte(yamlContent), &raw); err != nil {
		return nil, fmt.Errorf("yaml unmarshal error: %w", err)
	}

	// Map raw YAML keys to struct fields
	fm.TaskCID = getStr(raw, "Task_CID")
	fm.RefAgentID = getStr(raw, "Ref_Agent_ID")
	fm.ParentCID = getStr(raw, "Parent_CID")
	fm.BranchTag = getStr(raw, "Branch_Tag")
	fm.Timestamp = getStr(raw, "Timestamp")

	fm.DomainTags = getStrSlice(raw, "Domain_Tags")
	fm.ExecutionFramework = getStr(raw, "Execution_Framework")
	fm.BaseModelTier = getStr(raw, "Base_Model_Tier")
	fm.DataSovereignty = getStr(raw, "Data_Sovereignty")

	fm.InputContract = parseContract(raw, "Input_Contract")
	fm.OutputContract = parseContract(raw, "Output_Contract")

	fm.SuccessRateEst = getFloat(raw, "Success_Rate_Est")
	fm.AvgTokenCost = getInt(raw, "Avg_Token_Cost")

	if sp, ok := raw["Split_Protocol"]; ok {
		if spMap, ok := sp.(map[string]interface{}); ok {
			fm.SplitProtocol = models.SplitProtocol{
				OriginalShare: getFloat(spMap, "Original_Share"),
				BranchShare:   getFloat(spMap, "Branch_Share"),
			}
		}
	}

	return &fm, nil
}

// parseContract extracts a Contract from a raw YAML map.
func parseContract(raw map[string]interface{}, key string) models.Contract {
	c := models.Contract{}
	if v, ok := raw[key]; ok {
		if cm, ok := v.(map[string]interface{}); ok {
			c.Type = getStr(cm, "Type")
			c.SchemaHash = getStr(cm, "Schema_Hash")
			c.Sample = cm["Sample"]
		}
	}
	return c
}

// parseBody parses the Markdown body into structured sections.
func parseBody(content string) (*models.Body, error) {
	body := &models.Body{}

	// Extract task goal
	body.TaskGoal = extractTaskGoal(content)

	// Extract steps
	body.Steps = extractSteps(content)

	// Extract patch notes
	body.PatchNotes = extractPatchNotes(content)

	return body, nil
}

// extractTaskGoal finds the content under "# 任务目标" or "# Task Goal".
func extractTaskGoal(content string) string {
	re := regexp.MustCompile(`(?m)^#\s+.*?(?:任务目标|Task Goal).*?$`)
	loc := re.FindStringIndex(content)
	if loc == nil {
		return ""
	}
	// Find the next heading (# level)
	rest := content[loc[1]:]
	nextHeading := regexp.MustCompile(`(?m)^\s*#`)
	nextLoc := nextHeading.FindStringIndex(rest)
	var goalText string
	if nextLoc != nil {
		goalText = rest[:nextLoc[0]]
	} else {
		goalText = rest
	}
	return strings.TrimSpace(goalText)
}

// extractSteps parses all step sections (both ## [Step N] and ### Step N formats).
func extractSteps(content string) []models.Step {
	var steps []models.Step

	// Find all step headers
	headers := stepHeaderRegex.FindAllStringSubmatchIndex(content, -1)
	if len(headers) == 0 {
		return steps
	}

	for i, header := range headers {
		// Extract step number and title from either format
		// Regex groups: (\d+)=group1, (.+?)=group2 for [Step N: Title]
		//               (\d+)=group3, (.+?)=group4 for Step N: Title
		// FindAllStringSubmatchIndex returns [matchStart, matchEnd, g1s, g1e, g2s, g2e, g3s, g3e, g4s, g4e]
		var idx int
		var title string
		if header[2] >= 0 && header[3] >= 0 {
			// Format 1: ## [Step N: Title]
			idx, _ = strconv.Atoi(content[header[2]:header[3]])
			if header[4] >= 0 && header[5] >= 0 {
				title = strings.TrimSpace(content[header[4]:header[5]])
			}
		} else if header[6] >= 0 && header[7] >= 0 {
			// Format 2: ### Step N: Title
			idx, _ = strconv.Atoi(content[header[6]:header[7]])
			if header[8] >= 0 && header[9] >= 0 {
				title = strings.TrimSpace(content[header[8]:header[9]])
			}
		}

		// Extract step body (content between this header and the next)
		start := header[1]
		end := len(content)
		if i+1 < len(headers) {
			end = headers[i+1][0]
		}
		stepBody := content[start:end]

		step := models.Step{
			Index: idx,
			Title: title,
		}

		// Extract CoT
		cotMatches := cotRegex.FindStringSubmatch(stepBody)
		if cotMatches != nil {
			step.CoT = strings.TrimSpace(cotMatches[1])
		}

		// Extract Tool Call
		step.ToolCall = extractToolCall(stepBody)

		steps = append(steps, step)
	}

	return steps
}

// extractToolCall parses tool call information from a step body.
// Supports both the legacy **Name:** format and the ```tool_call block format.
func extractToolCall(stepBody string) *models.ToolCall {
	// Try the ```tool_call block format first
	if blockMatch := toolCallBlockRegex.FindStringSubmatch(stepBody); blockMatch != nil {
		return parseToolCallBlock(blockMatch[1])
	}

	// Fall back to **Name:** format
	nameMatch := toolCallNameRegex.FindStringSubmatch(stepBody)
	if nameMatch == nil {
		return nil
	}

	tc := &models.ToolCall{
		Name: strings.TrimSpace(nameMatch[1]),
	}

	// Parse Args as JSON
	argsMatch := toolCallArgsRegex.FindStringSubmatch(stepBody)
	if argsMatch != nil {
		argsStr := strings.TrimSpace(argsMatch[1])
		var args interface{}
		if err := json.Unmarshal([]byte(argsStr), &args); err == nil {
			tc.Args = args
		} else {
			tc.Args = argsStr
		}
	}

	// Parse Response Mock Schema as JSON
	respMatch := toolCallResponseRegex.FindStringSubmatch(stepBody)
	if respMatch != nil {
		respStr := strings.TrimSpace(respMatch[1])
		var resp interface{}
		if err := json.Unmarshal([]byte(respStr), &resp); err == nil {
			tc.ResponseMockSchema = resp
		} else {
			tc.ResponseMockSchema = respStr
		}
	}

	return tc
}

// parseToolCallBlock parses the YAML-like tool_call block format.
func parseToolCallBlock(block string) *models.ToolCall {
	tc := &models.ToolCall{}
	lines := strings.Split(block, "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if strings.HasPrefix(line, "name:") {
			tc.Name = strings.TrimSpace(strings.TrimPrefix(line, "name:"))
			tc.Name = strings.Trim(tc.Name, `"'`)
		}
	}
	if tc.Name == "" {
		return nil
	}
	// Try to parse args and response_mock_schema from YAML-like block
	var raw map[string]interface{}
	if err := yaml.Unmarshal([]byte(block), &raw); err == nil {
		if args, ok := raw["args"]; ok {
			tc.Args = args
		}
		if resp, ok := raw["response_mock_schema"]; ok {
			tc.ResponseMockSchema = resp
		}
	}
	return tc
}

// extractPatchNotes finds the Patch Notes section content.
func extractPatchNotes(content string) string {
	matches := patchNotesRegex.FindStringSubmatch(content)
	if matches != nil {
		return strings.TrimSpace(matches[1])
	}
	return ""
}

// === Helper functions for type-safe map access ===

func getStr(m map[string]interface{}, key string) string {
	if v, ok := m[key]; ok {
		if s, ok := v.(string); ok {
			return s
		}
	}
	return ""
}

func getFloat(m map[string]interface{}, key string) float64 {
	if v, ok := m[key]; ok {
		switch n := v.(type) {
		case float64:
			return n
		case int:
			return float64(n)
		}
	}
	return 0
}

func getInt(m map[string]interface{}, key string) int {
	if v, ok := m[key]; ok {
		switch n := v.(type) {
		case int:
			return n
		case float64:
			return int(n)
		}
	}
	return 0
}

func getStrSlice(m map[string]interface{}, key string) []string {
	if v, ok := m[key]; ok {
		if slice, ok := v.([]interface{}); ok {
			result := make([]string, 0, len(slice))
			for _, item := range slice {
				if s, ok := item.(string); ok {
					result = append(result, s)
				}
			}
			return result
		}
	}
	return nil
}
