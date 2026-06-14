package parser

import (
	"os"
	"path/filepath"
	"testing"
)

func TestParseGeneratedSnapshots(t *testing.T) {
	dir := "../../testdata/generated"
	files, err := filepath.Glob(filepath.Join(dir, "*.amd"))
	if err != nil {
		t.Fatalf("glob error: %v", err)
	}
	if len(files) == 0 {
		t.Skip("no generated files found, run `make gentest` first")
	}

	// Test first 50 snapshots
	limit := 50
	if len(files) < limit {
		limit = len(files)
	}

	for i := 0; i < limit; i++ {
		data, err := os.ReadFile(files[i])
		if err != nil {
			t.Errorf("read %s: %v", files[i], err)
			continue
		}
		snap, err := Parse(string(data))
		if err != nil {
			t.Errorf("parse %s: %v", filepath.Base(files[i]), err)
			continue
		}
		if snap.Frontmatter.TaskCID == "" {
			t.Errorf("%s: TaskCID is empty", filepath.Base(files[i]))
		}
		if len(snap.Body.Steps) < 2 {
			t.Errorf("%s: expected >=2 steps, got %d", filepath.Base(files[i]), len(snap.Body.Steps))
		}
	}
	t.Logf("Parsed %d/%d generated snapshots successfully", limit, len(files))
}
