# Fase 03 — Inventario, transferencias y push SSE

**Prioridad:** alta  
**Capas:** Backend + Web + KMP  
**Por qué:** admin en web mueve stock; el PDV debe enterarse sin polling ni “recargar a mano”.

## Entrada

- Transferencias almacén → PDV atómicas en backend (validación de stock).
- SSE hub + evento `stock.transfer` / `inventory.updated`.
- `PosRealtimeSync` en KMP.

## Tareas

### Backend

| ID | Tarea | Detalle |
|----|--------|---------|
| 03.B1 | Transferencia atómica | Confirmado: descuento origen + alta destino + audit en la misma transacción lógica de snapshot. |
| 03.B2 | Fallo parcial imposible | Tests de transferencia fallida (stock insuficiente) sin mutar snapshot. |
| 03.B3 | SSE fiable | Publish tras `Put` exitoso; payload con `unitId` obligatorio. |
| 03.B4 | (Opcional) Recepción confirmada | Mismo patrón SSE `inventory.updated` al confirmar entrada en almacén. |

### KMP

| ID | Tarea | Detalle |
|----|--------|---------|
| 03.K1 | Filtro por PDV asignado | Ignorar eventos de otros `unitId`. |
| 03.K2 | Refresh stock + snapshot | `getStock` / unidades / `LoadPosSnapshot` + `refreshAll` en SalesViewModel. |
| 03.K3 | Toast de negocio | “Stock actualizado por transferencia {number}”. |
| 03.K4 | Offline: encolar invalidación | Si el evento llega al reconectar (o solo refresh al Connected), no perder actualización. |

### Web

| ID | Tarea | Detalle |
|----|--------|---------|
| 03.W1 | UX transferencia | Feedback claro de éxito/error; no duplicar lógica de dominio. |
| 03.W2 | Kardex legible | Tras transferencia, movimiento visible y explicable. |

## Criterio de salida

- [ ] Transferencia web → POS del PDV destino refleja stock sin reiniciar app.
- [ ] Transferencia con stock insuficiente no altera inventario.
- [ ] Kardex muestra salida almacén + entrada unidad.

## Evidencia

Log: `SSE stock.transfer` → `PosRealtimeSync` → `SalesViewModel stock invalidate`.
