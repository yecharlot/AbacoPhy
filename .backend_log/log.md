
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
