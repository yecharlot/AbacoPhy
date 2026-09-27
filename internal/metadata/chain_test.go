package metadata

import (
	"context"
	"testing"

	"github.com/yecharlot/AbacoPhy/internal/domain"
)

func TestEmptyPayloadNoError(t *testing.T) {
	_, err := DefaultChain().Dispatch(context.Background(), Request{Payload: nil})
	if err != nil {
		t.Fatal(err)
	}
}

func TestKeyHandler(t *testing.T) {
	var got any
	c := NewChain(KeyHandler{Key: "ext", OnKey: func(ctx context.Context, req Request, value any) error {
		got = value
		return nil
	}})
	_, err := c.Dispatch(context.Background(), Request{Payload: domain.Metadata{"ext": map[string]any{"source": "pos"}}})
	if err != nil {
		t.Fatal(err)
	}
	m := got.(map[string]any)
	if m["source"] != "pos" {
		t.Fatalf("%v", got)
	}
}

func TestUnknownSkipped(t *testing.T) {
	res, err := NewChain().Dispatch(context.Background(), Request{Payload: domain.Metadata{"future": 1}})
	if err != nil || len(res.SkippedKeys) != 1 {
		t.Fatalf("%+v %v", res, err)
	}
}

func TestEntryZeroMetadata(t *testing.T) {
	var e domain.Entry
	if e.Metadata != nil {
		t.Fatal("expected nil")
	}
}
