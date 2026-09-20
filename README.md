# ÁbacoPhy

**Contabilidad para PyME** — API REST + PWA offline-first.  
Personalizable por negocio. Persistencia local + anclas **CID** (estilo IPFS) y **Durable Object** opcional (Cloudflare).

> Motor conceptual: **Alset** (roles/token, rastro content-addressable, apps `*.app.ans`).  
> Dominio ANS de la app: **`abacophy.app.ans`**

---

## Qué incluye (v0.1)

| Módulo | Descripción |
|--------|-------------|
| Ingresos / gastos | Asientos con plan de cuentas |
| Inventario | Productos y cantidades |
| Nómina | Empleados y nóminas |
| Facturación | Facturas con líneas y CID |
| Multi-negocio | Tenant personalizable (nombre, moneda, datos) |
| Roles | `master`, `admin`, `contador`, `operador`, `readonly` |
| Offline-first | Cola local + `POST /api/v1/sync/push` |
| PWA | Instalable, responsive (móvil / tablet / PC) |

---

## Producción

- **URL:** https://abacophy.onrender.com  
- **ANS:** https://abacophy.onrender.com/w/abacophy.app.ans  
- **API:** https://abacophy.onrender.com/api/v1/info  

## Arranque local

```bash
git clone https://github.com/yecharlot/AbacoPhy.git
cd AbacoPhy
go mod tidy
go run ./cmd/abacophy
```

- App / PWA: http://localhost:8090/  
- Alias ANS: http://localhost:8090/w/abacophy.app.ans  
- API info: http://localhost:8090/api/v1/info  

### Usuarios por defecto

| Usuario | Contraseña | Rol |
|---------|------------|-----|
| `master` | `AbacoPhy#Master1` | Mantenimiento global (transparente al negocio) |
| `admin` | `admin123` | Administrador del negocio demo |

**Cambia estas claves en cuanto salgas a producción.**

---

## API REST (consumo móvil / PWA)

Base: `/api/v1`

| Método | Ruta | Notas |
|--------|------|--------|
| GET | `/info` | Metadatos públicos |
| POST | `/auth/login` | `{username,password}` → token |
| POST | `/auth/logout` | Bearer |
| GET | `/auth/me` | Usuario + tenant + vistas |
| GET/PUT | `/tenant` | Personalización del negocio |
| GET | `/accounts` | Plan de cuentas |
| GET/POST | `/entries` | Ingresos y gastos |
| GET/POST | `/inventory` | Inventario |
| GET/POST | `/payroll/employees` | Empleados |
| GET/POST | `/payroll/payslips` | Nóminas |
| GET/POST | `/invoices` | Facturas |
| GET | `/sync` | Snapshot completo (pull offline) |
| POST | `/sync/push` | Empuje de cola offline |
| GET | `/master/tenants` | Solo rol master |

Autenticación: header `Authorization: Bearer <token>`.

### Ejemplo

```bash
TOKEN=$(curl -s -X POST http://localhost:8090/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin123"}' | jq -r .token)

curl -s http://localhost:8090/api/v1/auth/me -H "Authorization: Bearer $TOKEN" | jq .
```

---

## Persistencia

1. **Disco local** — `abacophy_data/tenants/*.json`  
2. **CID** — cada guardado genera `root_cid` y copia en `abacophy_data/cids/`  
3. **Durable Object** (opcional) — variables:

```bash
export ABACOPHY_DO_URL=https://<tu-worker>.workers.dev
export ABACOPHY_DO_TOKEN=<secreto>
```

Worker de referencia: `cloudflare/abacophy-do/`.

---

## Variables de entorno

| Variable | Default | Uso |
|----------|---------|-----|
| `PORT` | `8090` | Puerto HTTP |
| `ABACOPHY_DATA` | `./abacophy_data` | Datos |
| `ABACOPHY_STATIC` | `static` | PWA |
| `ABACOPHY_DO_URL` | — | Endpoint DO |
| `ABACOPHY_DO_TOKEN` | — | Bearer al DO |

---

## Integración con nodo Alset / PrismaTec

La app se expone como **`/w/abacophy.app.ans`**.  
Puedes desplegar ÁbacoPhy como servicio propio o registrar el front en el nodo Alset (`POST /api/apps/register` con los estáticos) y apuntar la API móvil a este servicio.

---

## Roadmap breve

- [ ] Partida doble completa y reportes (balance, P&L)  
- [ ] Multi-tenant por slug en URL  
- [ ] Pin de acceso rápido en móvil  
- [ ] Registro de app en nodo PrismaTec en arranque  
- [ ] Export CSV / PDF de facturas  

---

## Licencia

Misma línea que el ecosistema PrismaTec / Alset (ver LICENSE del repo origen cuando se unifique).
