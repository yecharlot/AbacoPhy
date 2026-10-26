# Fase 01 — Idempotencia y reconciliación del outbox de ventas

**Prioridad:** máxima  
**Capas:** Backend + KMP (POS)  
**Por qué primero:** sin esto, un corte largo puede duplicar ventas o dejar caja local mentinosa respecto al servidor.

## Entrada

- Outbox local (PENDING → IN_FLIGHT → CONFIRMED / REJECTED).
- `client_op_id` en metadata de venta.
- Serialización flexible de `metadata` (objeto o string).

## Tareas

### Backend

| ID | Tarea | Detalle |
|----|--------|---------|
| 01.B1 | ✅ Contrato idempotente `POST /pos/sales` | Si llega el mismo `client_op_id` (metadata), devolver la venta ya creada (200/201) sin duplicar líneas ni asientos. |
| 01.B2 | ✅ Documentar en `.backend_log` | Archivos tocados, forma del `client_op_id`, códigos de respuesta. |
| 01.B3 | ✅ Test de doble POST (dominio) | Mismo payload + mismo `client_op_id` → una sola venta en snapshot. |

### KMP

| ID | Tarea | Detalle |
|----|--------|---------|
| 01.K1 | ✅ Clasificar errores post-201 | Si el servidor respondió éxito pero el cliente falla al parsear, **no** marcar REJECTED; re-fetch por `client_op_id` o listado y entonces CONFIRMED. |
| 01.K2 | ✅ `replaceProvisional` siempre (vía confirmLocal) | Tras confirmación: borrar `local-{clientOpId}` y persistir venta servidor. |
| 01.K3 | ✅ Reconciliación barrido pendientes × `/pos/sales` al conectar | Al `Connected` o bootstrap: listar pendientes, cruzar con `/pos/sales`, cerrar confirmadas, dejar solo las realmente pendientes. |
| 01.K4 | ✅ Ya expuesto (pending / Syncing / SyncFinished rejected) en worker UI | UI/badge: pendiente / sincronizando / rechazada (negocio) / requiere revisión. |

### Web (opcional en esta fase)

| ID | Tarea | Detalle |
|----|--------|---------|
| 01.W1 | ✅ Lectura de ventas con metadata `client_op_id` | No romper listados si metadata es objeto. |

## Criterio de salida

- [x] Doble envío de la misma venta offline no crea dos registros en servidor. *(backend 01.B1–B3)*
- [x] Tras 201 + fallo de parse, la op no queda REJECTED indebidamente. *(KMP 01.K1 — recoverable + re-fetch)*
- [x] Al recuperar red, `replaceProvisional` sustituye `local-{clientOpId}` por venta servidor. *(01.K2)*
- [x] Reconciliación exhaustiva al bootstrap/Connected (listar pendientes vs `/pos/sales`) — `ReconcileOutboxSales` + drain.
- [x] Log/documentación en `.backend_log`.

### Estado fase 01

| ID | Estado |
|----|--------|
| 01.B1 | Hecho |
| 01.B2 | Hecho |
| 01.B3 | Hecho |
| 01.K1 | Hecho |
| 01.K2 | Hecho |
| 01.K3 | Hecho |
| 01.K4 | Hecho (estados worker) |
| 01.W1 | Hecho |

## Evidencia

Adjuntar en PR: log Napier de ciclo offline → online y captura de una sola venta en web/API.

---

**Fase 01 cerrada (2026-10-14)**  
Backend B1–B3 + KMP K1–K4 + Web W1. Criterios de salida de idempotencia outbox cumplidos en código.
