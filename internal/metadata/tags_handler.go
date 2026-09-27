package metadata

import (
	"context"
	"fmt"
	"time"

	"github.com/yecharlot/AbacoPhy/internal/domain"
)

// TagsHandler demonstrates a real feature on the chain:
// metadata key "tags" (array of strings or single string) is normalized and
// a processing stamp is written under metadata["int"]["tags_processed_at"].
//
// This is the pattern for future features: CanHandle → Handle, no core schema change.
type TagsHandler struct{}

func (TagsHandler) Name() string { return "feature.tags" }

func (TagsHandler) CanHandle(req Request) bool {
	if req.Payload == nil {
		return false
	}
	_, ok := req.Payload["tags"]
	return ok
}

func (TagsHandler) Handle(ctx context.Context, req Request) error {
	raw := req.Payload["tags"]
	tags, err := normalizeTags(raw)
	if err != nil {
		return err
	}
	req.Payload["tags"] = tags

	intBag, _ := req.Payload["int"].(map[string]any)
	if intBag == nil {
		intBag = map[string]any{}
	}
	intBag["tags_processed_at"] = time.Now().UTC().Format(time.RFC3339)
	intBag["tags_count"] = len(tags)
	req.Payload["int"] = intBag

	if req.Entity != nil {
		req.Entity.SetMetadata(req.Payload)
	}
	return nil
}

func normalizeTags(raw any) ([]string, error) {
	switch v := raw.(type) {
	case nil:
		return nil, nil
	case string:
		if v == "" {
			return []string{}, nil
		}
		return []string{v}, nil
	case []string:
		return v, nil
	case []any:
		out := make([]string, 0, len(v))
		for _, x := range v {
			s, ok := x.(string)
			if !ok {
				return nil, fmt.Errorf("tags: each item must be string")
			}
			out = append(out, s)
		}
		return out, nil
	default:
		return nil, fmt.Errorf("tags: expected string or array of strings")
	}
}

// DemoChain is DefaultChain + TagsHandler (simulation of a new product feature).
func DemoChain() *Chain {
	c := DefaultChain()
	c.Use(TagsHandler{})
	return c
}

// ApplyToEntry runs the demo chain on an entry's metadata (in-place). Safe if metadata nil.
func ApplyToEntry(ctx context.Context, e *domain.Entry) (Result, error) {
	if e == nil {
		return Result{}, nil
	}
	payload := e.Metadata
	if payload == nil {
		payload = domain.Metadata{}
	}
	res, err := DemoChain().Dispatch(ctx, Request{
		EntityType: "entry",
		EntityID:   e.ID,
		TenantID:   e.TenantID,
		Payload:    payload,
		Entity:     e,
	})
	return res, err
}
