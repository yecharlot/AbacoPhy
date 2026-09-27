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
}

type Handler interface {
	Name() string
	CanHandle(req Request) bool
	Handle(ctx context.Context, req Request) error
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

func DefaultChain() *Chain {
	c := NewChain()
	c.Use(KeyHandler{Key: "ext", Label: "ext.passthrough", OnKey: func(context.Context, Request, any) error { return nil }})
	c.Use(KeyHandler{Key: "ui", Label: "ui.passthrough", OnKey: func(context.Context, Request, any) error { return nil }})
	c.Use(KeyHandler{Key: "int", Label: "int.passthrough", OnKey: func(context.Context, Request, any) error { return nil }})
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
