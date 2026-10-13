# Decisiones de roadmap

Registro breve de decisiones que afecten el orden o el alcance. Una entrada por cambio.

## Formato

```
### YYYY-MM-DD — Título
- Contexto:
- Decisión:
- Impacto en fases:
```

## Inicial

### 2026-10-13 — Orden orientado a integridad, no a features nuevas
- Contexto: MVP demostrable; gap principal consistencia inventario–caja–libro bajo offline.
- Decisión: fases 01→04 antes de nuevas líneas de producto (promos, online, etc.).
- Impacto: post-confiable queda fuera de este roadmap.

### 2026-10-13 — SSE in-process aceptable en baseline
- Contexto: hub SSE por proceso es suficiente para mono-instancia.
- Decisión: no bloquear confiabilidad por bus distribuido; documentar límite (una instancia API).
- Impacto: fase 03; escalado horizontal es trabajo posterior.
