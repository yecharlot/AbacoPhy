package identity

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

func TestLoadOrCreatePersistsIdentity(t *testing.T) {
	dir := t.TempDir()

	first, err := LoadOrCreate(dir)
	if err != nil {
		t.Fatalf("first LoadOrCreate() error = %v", err)
	}
	if !validID(first.InstanceID) {
		t.Fatalf("generated instanceId is invalid: %q", first.InstanceID)
	}

	second, err := LoadOrCreate(dir)
	if err != nil {
		t.Fatalf("second LoadOrCreate() error = %v", err)
	}
	if second.InstanceID != first.InstanceID {
		t.Fatalf("instanceId changed across restarts: first=%q second=%q", first.InstanceID, second.InstanceID)
	}

	path := filepath.Join(dir, fileName)
	if _, err := os.Stat(path); err != nil {
		t.Fatalf("identity file does not exist: %v", err)
	}
}

func TestLoadOrCreateRejectsInvalidExistingIdentity(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, fileName)

	payload, err := json.Marshal(Instance{InstanceID: "not-an-id"})
	if err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(path, payload, 0600); err != nil {
		t.Fatal(err)
	}

	if _, err := LoadOrCreate(dir); err == nil {
		t.Fatal("expected invalid existing identity to fail")
	}
}
