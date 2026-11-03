
## 2026-10-26 — POST /users persistencia + hash password en reset

### Problema
- Alta de usuario desde Gestión de empleados: el cliente recibía 201 pero `Store.Put` se ignoraba (`_ = s.Store.Put`). Tras reinicio del backend o túnel Cloudflare, el usuario no existía → login KMP 401.
- Reset de contraseña: fallo de `HashPassword` se ignoraba (hash vacío no se actualizaba).

### Archivos
- `internal/api/ops.go`
  - POST `/api/v1/users`: exige `Put` OK; si falla, rollback in-memory y 500.
  - PUT `/api/v1/users`: si `password` viene y el hash falla → 500 (no silencioso).

### Nota operativa
Contraseña temporal al crear empleado / reset en UI: **`123456`**.

## 2026-11-03 — Presence: clientes conectados (header POS)

### Objetivo
Registrar terminales que hablan con el API **con o sin mDNS**, identificando instalación y sesión.

### Headers
- `X-AbacoPhy-Client-Id` — UUID estable del dispositivo/instalación
- `X-AbacoPhy-Client` — `pos-desktop` | `pos-android` | otros

### Backend
- `internal/presence/registry.go` — mapa en memoria, TTL 5 min
- Middleware `withPresence` en todas las rutas (excepto OPTIONS)
- Login enriquece audit + log stdout con client/ip/app
- `GET /api/v1/presence` — lista online (roles admin/master)

### POS
- `AppSettingsRepository.getOrCreateClientInstanceId()`
- HttpClient DefaultRequest envía ambos headers

### Ficheros
- `internal/presence/registry.go`
- `internal/api/server.go`, `presence_handlers.go`
- `posapps/.../AppSettingsRepository*.kt`, `getHttpClient.kt`, `infraModule.kt`
