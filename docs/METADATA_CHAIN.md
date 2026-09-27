# Metadata + Chain of Responsibility

**Branch:** `feature/metadata-chain`  
**Merge to `main`:** only on explicit human order (this branch is designed to be merge-safe).

## Field

```go
Metadata Metadata `json:"metadata,omitempty"` // map[string]any
```

Optional on persistent entities. Old API clients and CID snapshots without the field keep working (`omitempty` + nil zero value).

## Chain

Package `internal/metadata`:

| Piece | Role |
|-------|------|
| `Handler` | `CanHandle` → `Handle` |
| `KeyHandler` | Match one metadata key |
| `Chain.Dispatch` | Run all matching handlers |
| `Chain.Apply` | Dispatch + merge payload onto `MetaEntity` |
| `DefaultChain` | Namespaces + simulated product features |

Unknown keys alone → `SkippedKeys`, **no error**. Empty payload → no-op.

### Namespaces

| Prefix | Use |
|--------|-----|
| `ext.*` | Integrations / commercial features |
| `ui.*` | Front hints |
| `int.*` | Internal flags (not ledger) |

### Simulated features (merge proof)

| Key | Behavior |
|-----|----------|
| `ext.fiscal` | Requires `{code}`; side-effect fiscal.code |
| `ext.loyalty` | Points object or number |
| `ext.shipping` | Requires `carrier` |
| `ui.highlight` | bool or string |
| `int.audit_tag` | non-empty string |

Register more: `chain.Use(KeyHandler{Key: "ext.myfeature", OnKey: ...})` — **no schema migration**.

## Non-goals

- Do **not** store partida doble / balances only in metadata.
- Metadata is not a substitute for accounts/entries.

## Merge readiness checklist

- [x] Field optional (`omitempty`) on domain models  
- [x] CoR package + unit tests  
- [x] Simulation of **new** features only via handlers  
- [x] Extra handler registerable without model changes  
- [x] Validation errors isolated to bad feature payloads  
- [x] Unknown keys do not break dispatch when mixed with known keys  
- [x] Docs updated  

**Verdict:** safe to merge from a backend/metadata perspective when you order it. UI may ignore unknown keys until the webapp consumes them.
