package metadata

import (
	"context"
	"testing"

	"github.com/yecharlot/AbacoPhy/internal/domain"
)

func TestEmpty(t *testing.T) {
	c := DefaultChain()
	res, err := c.Dispatch(context.Background(), Request{})
	if err != nil || len(res.Notes) == 0 {
		t.Fatalf("%+v %v", res, err)
	}
}

func TestExtKey(t *testing.T) {
	c := DefaultChain()
	res, err := c.Dispatch(context.Background(), Request{
		Payload: domain.Metadata{"ext": map[string]any{"pos": true}},
	})
	if err != nil || len(res.HandledKeys) == 0 {
		t.Fatalf("%+v %v", res, err)
	}
}

func TestUnknownSkipped(t *testing.T) {
	c := DefaultChain()
	res, err := c.Dispatch(context.Background(), Request{Payload: domain.Metadata{"future": 1}})
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

// TestSimulateNewFeaturesViaChain proves product features can be introduced
// only through metadata + CoR (no model/schema migration).
func TestSimulateNewFeaturesViaChain(t *testing.T) {
	c := DefaultChain()
	inv := &domain.Invoice{ID: "inv-sim-1"}
	payload := domain.Metadata{
		"ext.fiscal":   map[string]any{"code": "B01", "regime": "general"},
		"ext.loyalty":  map[string]any{"points": float64(15), "customer_id": "c-9"},
		"ext.shipping": map[string]any{"carrier": "CubanPost", "tracking": "CP-100"},
		"ui.highlight": true,
		"int.audit_tag": "pos-pilot-2026",
	}
	res, err := c.Apply(context.Background(), Request{
		EntityType: "invoice",
		EntityID:   inv.ID,
		TenantID:   "t1",
		Payload:    payload,
		Entity:     inv,
	})
	if err != nil {
		t.Fatalf("apply: %v", err)
	}
	// All feature handlers must run
	want := map[string]bool{
		"ext.fiscal": true, "ext.loyalty": true, "ext.shipping": true,
		"ui.highlight": true, "int.audit_tag": true,
	}
	for _, h := range res.HandledKeys {
		delete(want, h)
	}
	if len(want) > 0 {
		t.Fatalf("handlers missing %v; got %v", want, res.HandledKeys)
	}
	if res.SideEffects["fiscal.code"] != "B01" {
		t.Fatalf("fiscal side effect: %+v", res.SideEffects)
	}
	if res.SideEffects["loyalty.points"] != float64(15) {
		t.Fatalf("loyalty: %+v", res.SideEffects)
	}
	if res.SideEffects["shipping.carrier"] != "CubanPost" {
		t.Fatalf("shipping: %+v", res.SideEffects)
	}
	if inv.Metadata == nil || inv.Metadata["ext.fiscal"] == nil {
		t.Fatalf("entity metadata not merged: %+v", inv.Metadata)
	}
}

func TestFiscalValidationFails(t *testing.T) {
	c := DefaultChain()
	_, err := c.Dispatch(context.Background(), Request{
		Payload: domain.Metadata{"ext.fiscal": map[string]any{"regime": "x"}},
	})
	if err == nil {
		t.Fatal("expected error for missing fiscal.code")
	}
}

func TestUnknownStillSafeAlongsideFeatures(t *testing.T) {
	c := DefaultChain()
	// mix known feature + unknown key: known handled; unknown alone would skip but here chain still succeeds
	res, err := c.Dispatch(context.Background(), Request{
		Payload: domain.Metadata{
			"ext.fiscal": map[string]any{"code": "A11"},
			"future.x":   1,
		},
	})
	if err != nil {
		t.Fatal(err)
	}
	found := false
	for _, h := range res.HandledKeys {
		if h == "ext.fiscal" {
			found = true
		}
	}
	if !found {
		t.Fatalf("expected ext.fiscal handled: %+v", res)
	}
}

func TestRegisterExtraHandlerWithoutTouchingModels(t *testing.T) {
	c := DefaultChain()
	called := false
	c.Use(KeyHandler{
		Key:   "ext.warranty",
		Label: "ext.warranty",
		OnKey: func(ctx context.Context, req Request, value any) error {
			called = true
			noteEffect(ctx, "warranty", value)
			return nil
		},
	})
	res, err := c.Dispatch(context.Background(), Request{
		Payload: domain.Metadata{"ext.warranty": map[string]any{"months": float64(12)}},
	})
	if err != nil || !called {
		t.Fatalf("%+v %v", res, err)
	}
	if res.SideEffects["warranty"] == nil {
		t.Fatal("expected warranty side effect")
	}
}
