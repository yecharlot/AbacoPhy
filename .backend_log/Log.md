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

---

## Fase 2 — Venta POS: persistir asiento de ingreso tras `ApplyIncome`

**Fecha:** 2026-09-25  
**Archivo:** `internal/api/ops.go` → `handlePOSSales` (POST)  
**Estado:** propuesto / aplicar tras Fase 1

### Propósito

Que cada venta de punto de venta deje un **asiento contable** (`Entry`) de tipo `income` en el libro, no solo el movimiento de saldos en Caja e Ingresos por ventas.

### Por qué lo cambiamos

`domain.ApplyIncome`:

1. Localiza cuentas 4000 (ingresos) y 1000 (caja).
2. Llama a `ApplyDoubleEntry` → **sube saldos**.
3. Devuelve un `*Entry` **sin ID ni persistencia**.

El handler POS **ignoraba** ese retorno: no hacía `snap.Entries = append(...)`.  
Consecuencia:

- Plan de cuentas: Caja e Ingresos correctos (saldos).
- Libro de asientos (`GET /entries`) y sumas por `type == "income"`: **faltaba** la venta.
- Tras Fase 1 el panel usa saldos (OK), pero el libro y auditoría seguían incompletos; trazabilidad y futuros recálculos desde asientos fallarían.

### Qué mejora

- Partida doble **completa**: saldo + asiento para el mismo hecho económico.
- Auditoría y listados de asientos reflejan la venta POS.
- Prepara la Fase 3 (COGS como `expense` documentado) y un eventual recompute de saldos desde el libro.

### Impacto en el backend

| Área | Efecto |
|------|--------|
| `ApplyIncome` | Sin cambios de firma; se usa el `*Entry` devuelto |
| `snap.Entries` | +1 registro por venta con total > 0 |
| Saldos | **Iguales** (ya los aplicaba `ApplyIncome`) — no hay doble conteo |
| Persistencia | `Store.Put` guarda el entry junto a la venta |
| COGS | Sin cambio en esta fase (`type: "inventory"` sigue igual) |

Campos rellenados en el entry:

- `ID`, `TenantID`, `Date` (fecha de la venta o hoy), `CreatedAt`
- `Type: "income"`, `AccountID` (4000), `Counterpart` (1000), `Amount`, `Description`, `CreatedBy` (ya venían de `ApplyIncome`)

### Qué posibilita al frontend

- Historial de asientos / auditoría de ventas coherente con el POS.
- Métrica auxiliar `entries_income_total` (Fase 1) se acerca a los ingresos del plan de cuentas **para ventas nuevas**.
- No cambia el contrato del summary; refuerza datos para pantallas de libro y reportes por asiento.

### Antes

```text
ApplyIncome(snap, total, desc, user)  // solo saldos Caja↑ Ingresos↑
// Entry devuelto descartado
if costT > 0 {
  ApplyInventoryOut(...)              // saldos Inv↓ COGS↑
  Entries.append(type: "inventory")   // solo el costo en el libro
}
POSSales.append(sale)
```

### Después

```text
ent := ApplyIncome(...)               // saldos Caja↑ Ingresos↑
if ent != nil {
  ent.ID / TenantID / Date / CreatedAt
  Entries.append(*ent)                // libro: income
}
if costT > 0 {
  ApplyInventoryOut(...)
  Entries.append(type: "inventory")   // Fase 3 lo pasará a expense
}
POSSales.append(sale)
```

### Prueba rápida

1. Registrar una venta POS con total > 0.
2. `GET /api/v1/entries` → debe existir asiento `type: "income"` con el importe de la venta y descripción `Venta vendedor …`.
3. Plan de cuentas: Caja e Ingresos incrementados una sola vez (no duplicar).
4. `GET /api/v1/reports/summary` → `ecuacion.ingresos` refleja el saldo de cuentas income.

### Dependencias

- **Fase 1** recomendada (summary desde saldos) pero no bloqueante a nivel de compilación.
- **Fase 3** (siguiente): tipar COGS como `expense` con `AccountID` 5000.

### Archivo entregado

- `internal/api/ops.go` (completo, solo bloque POS de contabilidad modificado)

---

## Fase 3 — Costo de venta (COGS): asiento `expense` ligado a cuenta 5000

**Fecha:** 2026-09-25  
**Archivo:** `internal/api/ops.go` → `handlePOSSales` (POST), bloque `costT > 0`  
**Estado:** propuesto / aplicar tras Fase 2

### Propósito

Que el **costo de la mercancía vendida** quede en el libro como asiento de **gasto** (`type: "expense"`), con `AccountID` de la cuenta **5000 Costo de ventas** y contrapartida **1300 Inventarios**, coherente con los saldos que ya aplica `ApplyInventoryOut`.

### Por qué lo cambiamos

Antes (y tras Fase 2 el costo seguía así):

```go
ApplyInventoryOut(snap, costT)           // saldos: Inv↓ COGS↑  ✓
Entries.append(Type: "inventory", ...) // libro: tipo genérico  ✗
```

Problemas:

1. `type: "inventory"` **no** es `expense` → sumas del libro por gastos lo ignoran.
2. El asiento **no** llevaba `AccountID` de 5000 ni `Counterpart` de 1300 → poco útil para mayor y T-accounts.
3. Tras Fase 1, el panel usa **saldos** (5000 sí cuenta en `ecuacion.gastos`), pero el libro y `entries_expense_total` seguían desfasados respecto al plan de cuentas **para ventas nuevas**.

### Qué mejora

| Capa | Comportamiento |
|------|----------------|
| Saldos | Igual: solo `ApplyInventoryOut` (sin segundo `ApplyDoubleEntry`) |
| Libro | Entry `expense` con cuenta 5000 y contrapartida 1300 |
| Ecuación | Sin cambio de fórmula; gastos por saldos ya incluían 5000 |
| Libro vs saldos | Se alinean en operaciones POS nuevas |

### Impacto en el backend

- **No** se llama `ApplyDoubleEntry` sobre el COGS otra vez → evita **doble conteo** en saldos.
- Se usan `domain.FindAccountByCode` para 5000 y 1300 (ya exportadas en `ledger.go`).
- Si faltara la cuenta 5000/1300 en el plan, el asiento igual se guarda (Amount/Description); el `AccountID` quedaría vacío solo en ese caso degradado.
- Ventas con `costT == 0` no generan asiento de costo (igual que antes).

### Qué posibilita al frontend

- Listados de asientos / auditoría: el costo de venta aparece como **gasto**, no como movimiento opaco `inventory`.
- `entries_expense_total` (Fase 1, métrica auxiliar) se acerca a `ecuacion.gastos` para el flujo POS completo (ingreso + COGS).
- Mayor claridad en reportes que filtren `type=expense`.

### Antes

```text
ApplyInventoryOut → saldos 1300↓ 5000↑
Entry{ Type: "inventory", Amount: costT }   // sin AccountID
```

### Después

```text
ApplyInventoryOut → saldos 1300↓ 5000↑   // una sola vez
Entry{
  Type: "expense",
  AccountID: <id cuenta 5000>,
  Counterpart: <id cuenta 1300>,
  Amount: costT,
  Description: "Costo venta <número>",
}
```

### Prueba rápida

1. Venta POS con costo de líneas > 0.
2. `GET /api/v1/entries` → asiento `type: "expense"`, descripción `Costo venta …`, amount = costo.
3. Plan de cuentas: 5000 incrementa **una vez**; 1300 decrementa **una vez**.
4. `reports/summary` → `ecuacion.gastos` incluye el saldo de 5000; no debe “inflarse” respecto al plan.

### Dependencias

- **Fase 2** (asiento de ingreso POS) debe estar aplicada en el mismo `ops.go`.
- **Fase 1** (summary desde saldos) recomendada para el panel.

### Siguiente fase (opcional)

- Fase 4: `normalizeAccountType` en `EquationSnapshot` (`internal/domain/ledger.go`) por si hubiera tipos ES legacy.

### Archivo entregado

- `internal/api/ops.go` (completo: Fases 2 + 3 en el bloque contable POS)
