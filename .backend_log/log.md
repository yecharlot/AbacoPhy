# Backend log

## SSE /api/v1/events — canal realtime POS (offline recovery)

**Fecha:** 2026-10-12

### Motivo
Los PDV en contextos con cortes largos de red/energía (p.ej. Cuba) deben:
1. Detectar automáticamente que el backend volvió sin depender del vendedor.
2. Drenar el outbox de ventas al recuperar la conexión.
3. Preparar un canal único para notificaciones futuras (stock, confirmaciones).

### Endpoint
- `GET /api/v1/events` — `text/event-stream` (Server-Sent Events)
- Auth: Bearer token de sesión
- Eventos iniciales: `connected`, keepalives `: keepalive` + `ping` cada 15s
- Sin polling de endpoints de negocio

### Archivos
- `internal/api/events.go` — handler SSE
- `internal/api/server.go` — registro de ruta

### Cliente KMP
Se conecta en sesión Active; al abrir stream → markOk + drain outbox.
Reconexión con backoff exponencial al caer el stream.

## SSE stock.transfer — push a POS tras transferencia web

**Fecha:** 2026-10-12

### Motivo
Cuando un admin crea una transferencia almacén → punto de venta desde la web, los POS del tenant deben enterarse sin polling y refrescar stock local / cola offline.

### Backend
- `internal/api/sse_hub.go` — hub in-process por tenant
- `internal/api/events.go` — suscripción al hub + keepalive
- `internal/api/ops.go` `handleTransfers` POST éxito → `Publish(stock.transfer)` + `inventory.updated`
- Payload: `transferId`, `number`, `unitId`, `unitCode`, `unitName`, `lineCount`, `ts`

### Cliente KMP
`PosRealtimeSync` escucha `stock.transfer` / `inventory.updated`, filtra por `unitId` del vendedor y ejecuta refresh de snapshot POS (stock + ventas caché).

