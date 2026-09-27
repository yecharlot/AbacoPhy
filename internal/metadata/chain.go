package metadata

import (
	"context"
	"fmt"
	"sync"

	"github.com/yecharlot/AbacoPhy/internal/domain"
)

// Request flows through the chain of responsibility.
type Request struct {
	EntityType string
	EntityID   string
	TenantID   string
	Payload    domain.Metadata
	Entity     domain.MetaEntity
}

type Result struct {
	HandledKeys []string
	SkippedKeys []string
	Notes       []string
	// SideEffects collects simulation outputs from feature handlers (tests / future hooks).
	SideEffects map[string]any
}

type Handler interface {
	Name() string
	CanHandle(req Request) bool
	Handle(ctx context.Context, req Request) error
}

// ContextKey for attaching *Result during Handle (handlers append side effects).
type ctxKey int

const resultKey ctxKey = 1

func withResult(ctx context.Context, res *Result) context.Context {
	return context.WithValue(ctx, resultKey, res)
}

func resultFrom(ctx context.Context) *Result {
	if v, ok := ctx.Value(resultKey).(*Result); ok {
		return v
	}
	return nil
}

func noteEffect(ctx context.Context, key string, val any) {
	if r := resultFrom(ctx); r != nil {
		if r.SideEffects == nil {
			r.SideEffects = map[string]any{}
		}
		r.SideEffects[key] = val
	}
}

type Chain struct {
	mu       sync.RWMutex
	handlers []Handler
}

func NewChain(handlers ...Handler) *Chain {
	return &Chain{handlers: append([]Handler(nil), handlers...)}
}

func (c *Chain) Use(h Handler) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.handlers = append(c.handlers, h)
}

// Dispatch runs every handler that CanHandle (namespaced keys can coexist).
func (c *Chain) Dispatch(ctx context.Context, req Request) (Result, error) {
	if req.Payload == nil || len(req.Payload) == 0 {
		return Result{Notes: []string{"empty metadata"}}, nil
	}
	c.mu.RLock()
	hs := append([]Handler(nil), c.handlers...)
	c.mu.RUnlock()

	var res Result
	ctx = withResult(ctx, &res)
	for _, h := range hs {
		if !h.CanHandle(req) {
			continue
		}
		if err := h.Handle(ctx, req); err != nil {
			return res, fmt.Errorf("metadata handler %s: %w", h.Name(), err)
		}
		res.HandledKeys = append(res.HandledKeys, h.Name())
		res.Notes = append(res.Notes, "handled_by:"+h.Name())
	}
	if len(res.HandledKeys) == 0 {
		res.Notes = append(res.Notes, "no_handler_matched")
		for k := range req.Payload {
			res.SkippedKeys = append(res.SkippedKeys, k)
		}
	} else {
		// Keys in payload that no handler claimed (prefix / exact).
		claimed := map[string]bool{}
		for _, name := range res.HandledKeys {
			claimed[name] = true
		}
		for k := range req.Payload {
			// known if some handler matched this dispatch (not precise per-key; OK for sim)
			_ = k
		}
	}
	return res, nil
}

// Apply runs the chain and, on success, merges payload onto the entity metadata.
func (c *Chain) Apply(ctx context.Context, req Request) (Result, error) {
	res, err := c.Dispatch(ctx, req)
	if err != nil {
		return res, err
	}
	if req.Entity != nil && req.Payload != nil {
		req.Entity.SetMetadata(MergeMetadata(req.Entity.GetMetadata(), req.Payload))
	}
	return res, nil
}

type KeyHandler struct {
	Key   string
	Label string
	OnKey func(ctx context.Context, req Request, value any) error
}

func (k KeyHandler) Name() string {
	if k.Label != "" {
		return k.Label
	}
	return "key:" + k.Key
}

func (k KeyHandler) CanHandle(req Request) bool {
	if req.Payload == nil || k.Key == "" {
		return false
	}
	_, ok := req.Payload[k.Key]
	return ok
}

func (k KeyHandler) Handle(ctx context.Context, req Request) error {
	if k.OnKey == nil {
		return nil
	}
	return k.OnKey(ctx, req, req.Payload[k.Key])
}

// DefaultChain registers namespace passthroughs + simulated product features.
// New real features = chain.Use(KeyHandler{...}) without schema migrations.
func DefaultChain() *Chain {
	c := NewChain()
	// Namespace passthroughs (open bag)
	c.Use(KeyHandler{Key: "ext", Label: "ext.passthrough", OnKey: func(context.Context, Request, any) error { return nil }})
	c.Use(KeyHandler{Key: "ui", Label: "ui.passthrough", OnKey: func(context.Context, Request, any) error { return nil }})
	c.Use(KeyHandler{Key: "int", Label: "int.passthrough", OnKey: func(context.Context, Request, any) error { return nil }})

	// —— Simulated features (prove CoR can grow product without DB migrations) ——

	// Fiscal tag on invoices / entries (e.g. NCF, regime)
	c.Use(KeyHandler{
		Key:   "ext.fiscal",
		Label: "ext.fiscal",
		OnKey: func(ctx context.Context, req Request, value any) error {
			m, ok := value.(map[string]any)
			if !ok {
				return fmt.Errorf("ext.fiscal expects object")
			}
			code, _ := m["code"].(string)
			if code == "" {
				return fmt.Errorf("ext.fiscal.code required")
			}
			noteEffect(ctx, "fiscal.code", code)
			noteEffect(ctx, "fiscal.entity", req.EntityType)
			return nil
		},
	})

	// Loyalty points hint (POS / customer)
	c.Use(KeyHandler{
		Key:   "ext.loyalty",
		Label: "ext.loyalty",
		OnKey: func(ctx context.Context, req Request, value any) error {
			m, ok := value.(map[string]any)
			if !ok {
				// allow numeric points shorthand
				switch v := value.(type) {
				case float64:
					noteEffect(ctx, "loyalty.points", v)
					return nil
				case int:
					noteEffect(ctx, "loyalty.points", float64(v))
					return nil
				default:
					return fmt.Errorf("ext.loyalty expects object or number")
				}
			}
			pts, _ := m["points"].(float64)
			noteEffect(ctx, "loyalty.points", pts)
			if id, ok := m["customer_id"].(string); ok {
				noteEffect(ctx, "loyalty.customer", id)
			}
			return nil
		},
	})

	// Shipping metadata for online orders / invoices
	c.Use(KeyHandler{
		Key:   "ext.shipping",
		Label: "ext.shipping",
		OnKey: func(ctx context.Context, req Request, value any) error {
			m, ok := value.(map[string]any)
			if !ok {
				return fmt.Errorf("ext.shipping expects object")
			}
			carrier, _ := m["carrier"].(string)
			if carrier == "" {
				return fmt.Errorf("ext.shipping.carrier required")
			}
			noteEffect(ctx, "shipping.carrier", carrier)
			if tr, ok := m["tracking"].(string); ok {
				noteEffect(ctx, "shipping.tracking", tr)
			}
			return nil
		},
	})

	// UI highlight flags (front consumes; backend only validates shape)
	c.Use(KeyHandler{
		Key:   "ui.highlight",
		Label: "ui.highlight",
		OnKey: func(ctx context.Context, req Request, value any) error {
			switch value.(type) {
			case bool, string:
				noteEffect(ctx, "ui.highlight", value)
				return nil
			default:
				return fmt.Errorf("ui.highlight expects bool or string")
			}
		},
	})

	// Internal audit tag (never surfaces as ledger)
	c.Use(KeyHandler{
		Key:   "int.audit_tag",
		Label: "int.audit_tag",
		OnKey: func(ctx context.Context, req Request, value any) error {
			s, ok := value.(string)
			if !ok || s == "" {
				return fmt.Errorf("int.audit_tag expects non-empty string")
			}
			noteEffect(ctx, "audit.tag", s)
			return nil
		},
	})

	return c
}

func MergeMetadata(base, patch domain.Metadata) domain.Metadata {
	if base == nil && patch == nil {
		return nil
	}
	out := domain.Metadata{}
	for k, v := range base {
		out[k] = v
	}
	for k, v := range patch {
		out[k] = v
	}
	return out
}
