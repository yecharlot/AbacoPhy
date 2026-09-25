# Backend Log — Ecuación contable

Registro de cambios en el backend de ÁbacoPhy para alinear **plan de cuentas**, **asientos** y **reportes** con el frontend (rama `webapp` mergeada).

---

## Fase 1 — `GET /api/v1/reports/summary` (única fuente de verdad para la ecuación)

**Fecha:** 2026-09-25  
**Archivo:** `internal/api/server.go` → `handleReportsSummary`  
**Estado:** propuesto / aplicar en rama `fix/backend-ecuacion-contable`

### Propósito

Que el panel de **Resumen** (ecuación contable ampliada y KPIs de ingresos/gastos del período) muestre los mismos agregados que el **Plan de cuentas**, calculados solo desde los saldos (`Account.Balance`) por tipo.

### Por qué lo cambiamos

Antes, `handleReportsSummary` mezclaba dos fuentes:

| Campo top-level | Fuente antigua | Problema |
|-----------------|----------------|----------|
| `ingresos`, `gastos`, `income`, `expenses`, `neto` | Suma de `snap.Entries` por `type` | Omite movimientos que solo actualizan saldos (p.ej. COGS con asiento `inventory`, ventas POS sin append de entry) |
| `activo`, `pasivo`, `patrimonio`, bloque `ecuacion` | `domain.EquationSnapshot` (saldos) | Correcto, pero el front (y claves ES/EN duplicadas) priorizaban a veces los totales de asientos |

Eso producía en UI:

- **Descuadre** artificial: `Activo ≠ Pasivo + Patrimonio + (Ingresos − Gastos)`
- Cifras de ingresos/gastos distintas entre ecuación y plan de cuentas

### Qué mejora

1. **Una sola fuente de verdad** para la ecuación del dashboard: `EquationSnapshot(snap)`.
2. Contrato JSON estable para el frontend Svelte (`ecuacion`, `ingresos`/`gastos`, aliases EN).
3. Métricas del **libro de asientos** siguen disponibles, con nombres explícitos (`entries_income_total`, `entries_expense_total`), sin contaminar la ecuación.

### Impacto en el backend

- **Alcance:** solo el cuerpo JSON de respuesta de `handleReportsSummary`.
- **No cambia** persistencia, ni `ApplyDoubleEntry`, ni saldos en disco.
- El bucle que suma `Entries` se mantiene para las métricas auxiliares del libro.
- Compatibilidad: `income_total` / `expense_total` / `net` pasan a reflejar **saldos** (como el plan de cuentas), no el libro. Si algún cliente externo dependía de “solo asientos”, debe usar `entries_*_total`.

### Qué posibilita al frontend

- El mapper de `webapp` (`accountingMapper.toEquation`) que prioriza `ecuacion` y las claves top-level recibe valores **coherentes** con el plan de cuentas.
- El `EquationCard` puede mostrar **Cuadra** cuando los saldos están bien, en lugar de descuadre por fuentes mezcladas.
- StatCards de ingresos/gastos del resumen se alinean con las cuentas de tipo `income` / `expense`.

### Antes

```text
income, expense := sum(Entries where type in {income, expense})

JSON:
  ingresos / income / income_total  → income   (libro)
  gastos / expenses / expense_total → expense  (libro)
  activo / assets                   → eq.activo (cuentas)
  ecuacion                          → eq completo (cuentas)

→ Panel: Activo desde cuentas, Ingresos/Gastos desde libro → desalineado
```

### Después

```text
eq := EquationSnapshot(snap)   // saldos por tipo de cuenta

JSON:
  ingresos / income / income_total / expenses… → eq.ingresos / eq.gastos / eq.neto
  activo / pasivo / patrimonio                   → eq.*
  ecuacion                                       → eq
  entries_income_total / entries_expense_total   → suma del libro (auxiliar)

→ Panel: toda la ecuación desde el mismo origen que el plan de cuentas
```

### Prueba rápida

```bash
# Con sesión autenticada
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:8090/api/v1/reports/summary | jq '.ecuacion, .ingresos, .gastos, .entries_income_total'
```

Comparar `.ingresos` / `.gastos` con la suma de balances de cuentas tipo income/expense en `GET /api/v1/accounts`.

### Siguiente fase (no incluida aquí)

- Fase 2: POS — persistir asiento tras `ApplyIncome`
- Fase 3: COGS — asiento `type: "expense"` ligado a cuenta 5000
- Fase 4 (opc.): `normalizeAccountType` en `EquationSnapshot`
