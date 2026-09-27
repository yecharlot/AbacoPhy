package metadata

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/yecharlot/AbacoPhy/internal/domain"
)

func TestTagsHandlerNormalizesAndStamps(t *testing.T) {
	e := &domain.Entry{
		ID:       "e1",
		TenantID: "t1",
		Amount:   10,
		Metadata: domain.Metadata{"tags": []any{"promo", "mostrador"}},
	}
	res, err := ApplyToEntry(context.Background(), e)
	if err != nil {
		t.Fatal(err)
	}
	found := false
	for _, h := range res.HandledKeys {
		if h == "feature.tags" {
			found = true
		}
	}
	if !found {
		t.Fatalf("expected feature.tags in %v", res.HandledKeys)
	}
	tags, ok := e.Metadata["tags"].([]string)
	if !ok || len(tags) != 2 {
		t.Fatalf("tags=%v", e.Metadata["tags"])
	}
	intBag, _ := e.Metadata["int"].(map[string]any)
	if intBag["tags_count"] != 2 {
		t.Fatalf("int=%v", intBag)
	}
}

func TestTagsHandlerInvalidType(t *testing.T) {
	e := &domain.Entry{Metadata: domain.Metadata{"tags": 123}}
	_, err := ApplyToEntry(context.Background(), e)
	if err == nil {
		t.Fatal("expected error")
	}
}

func TestOldEntryWithoutMetadataStillOK(t *testing.T) {
	e := &domain.Entry{ID: "old", Amount: 5}
	res, err := ApplyToEntry(context.Background(), e)
	if err != nil {
		t.Fatal(err)
	}
	if len(res.Notes) == 0 {
		t.Fatal("expected empty note")
	}
}

func TestJSONRoundTripWithTags(t *testing.T) {
	e := domain.Entry{
		ID: "x", Amount: 1,
		Metadata: domain.Metadata{"tags": []string{"a"}, "ext": map[string]any{"source": "pos"}},
	}
	b, err := json.Marshal(e)
	if err != nil {
		t.Fatal(err)
	}
	var back domain.Entry
	if err := json.Unmarshal(b, &back); err != nil {
		t.Fatal(err)
	}
	if back.Metadata["tags"] == nil {
		t.Fatal("tags lost")
	}
	// Simulate load of legacy JSON without metadata
	legacy := `{"id":"legacy","tenant_id":"t","date":"2026-01-01","type":"income","account_id":"a","amount":1,"currency":"CUP","description":"x","created_by":"u","created_at":"2026-01-01T00:00:00Z"}`
	var old domain.Entry
	if err := json.Unmarshal([]byte(legacy), &old); err != nil {
		t.Fatal(err)
	}
	if old.Metadata != nil {
		t.Fatalf("legacy should have nil metadata, got %v", old.Metadata)
	}
}
