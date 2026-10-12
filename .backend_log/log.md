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

