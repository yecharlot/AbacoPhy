# Metadata + Chain of Responsibility

**Branch:** `feature/metadata-chain` (merge to `main` only on explicit order)

## Field

```go
Metadata Metadata `json:"metadata,omitempty"` // map[string]any
```

Optional on persistent entities. Old API clients and CID snapshots without the field keep working.

## Chain

`internal/metadata`: handlers with `CanHandle` → `Handle`. Unknown keys are skipped (no error). Empty payload is a no-op.

Namespaces: `ext` (integrations), `ui` (front hints), `int` (internal flags).

Register new features with `chain.Use(KeyHandler{Key: "ext.myfeature", OnKey: ...})` without schema migrations.

## Non-goals

Do not store partida doble / balances only in metadata.
