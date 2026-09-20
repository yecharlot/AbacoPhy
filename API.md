# API REST ÁbacoPhy

Base URL (producción): `https://abacophy.onrender.com/api/v1`  

Autenticación: encabezado `Authorization: Bearer <token>` tras el login.  
Formato: JSON UTF-8. CORS abierto para clientes web y móviles.

La API está pensada para:

1. La **PWA** de ÁbacoPhy  
2. **Apps de terceros** (móvil nativa, integraciones, POS)

Los nombres de campos en JSON están en inglés estable (contrato de integración).  
Los textos de error orientados a usuario se devuelven en español.

---

## 1. Información pública

### `GET /info`

Metadatos del servicio (sin token).

```json
{
  "name": "ÁbacoPhy",
  "version": "0.1.0",
  "app_ans": "abacophy.app.ans",
  "api": "REST /api/v1",
  "offline": true,
  "modules": ["ingresos", "gastos", "inventario", "nomina", "facturacion", "cuentas"],
  "roles": ["master", "admin", "contador", "operador", "readonly"],
  "persistence": ["local", "cid", "durable_object_optional"]
}
```

### `GET /health`

Comprobación de vida: `{ "ok": true, ... }`.

---

## 2. Autenticación y roles (modelo tipo Alset)

En Alset, el acceso a una sección no es “todo o nada”: un **token** lleva un **rol** y el servidor solo abre las **vistas** permitidas (ACL).  
ÁbacoPhy aplica la misma idea sobre rutas REST.

### `POST /auth/login`

Cuerpo:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `username` | string | Usuario |
| `password` | string | Contraseña |

Respuesta `200`: `token`, `expires_at`, `user`, `views[]`.

Errores: `401` credenciales incorrectas.

### `POST /auth/logout`

Invalida el token actual.

### `GET /auth/me`

Sesión activa: usuario, negocio (tenant), `rev`, `root_cid`, `views`.

### Matriz de vistas → rutas

| Vista (`views`) | Rutas principales |
|-----------------|-------------------|
| `dashboard` | resúmenes vía reportes |
| `ingresos` | `POST /entries` tipo `income` |
| `gastos` | `POST /entries` tipo `expense` |
| `cuentas` | `GET /accounts` |
| `inventario` | `GET/POST /inventory` |
| `nomina` | `/payroll/employees`, `/payroll/payslips` |
| `facturas` | `GET/POST /invoices`, `GET /invoices/pdf` |
| `reportes` | `GET /entries`, `GET /reports/summary` |
| `tenant` | `GET/PUT /tenant` |
| `master` | `/master/tenants*` |
| `sync` | `/sync`, `/sync/push` |

Si el rol no incluye la vista → **403**.

---

## 3. Negocio (tenant)

### `GET /tenant`

Datos del negocio del token.

### `PUT` o `PATCH /tenant`

Personalización (nombre, moneda, teléfono, dirección, `settings`, etc.).  
Requiere vista `tenant`.

---

## 4. Plan de cuentas

### `GET /accounts`

```json
{
  "accounts": [
    {
      "id": "...",
      "code": "1000",
      "name": "Caja",
      "type": "asset",
      "balance": 0
    }
  ],
  "rev": 3
}
```

Tipos: `asset` (activo), `liability` (pasivo), `equity` (patrimonio), `income` (ingreso), `expense` (gasto).

---

## 5. Asientos (ingresos y gastos) — partida doble

### `GET /entries`

Lista de movimientos. Vista `reportes`.

### `POST /entries`

| Campo | Descripción |
|-------|-------------|
| `type` | `income` \| `expense` \| `transfer` |
| `account_id` | Cuenta de resultado (ingreso o gasto) |
| `amount` | Importe (> 0) |
| `description` | Concepto |
| `counterpart` | Opcional: cuenta de activo (por defecto Caja `1000`) |
| `date` | `YYYY-MM-DD` opcional |
| `currency` | Por defecto la del negocio |

**Efecto contable (ecuación ampliada)**  
`Activo = Pasivo + Patrimonio + (Ingresos − Gastos)`

| Tipo | Debe | Haber (efecto) |
|------|------|----------------|
| Ingreso | Caja/activo ↑ | Cuenta de ingreso ↑ |
| Gasto | Cuenta de gasto ↑ | Caja/activo ↓ |

Respuesta `201`:

```json
{
  "asiento": { "...": "..." },
  "ecuacion": {
    "activo": 0,
    "pasivo": 0,
    "patrimonio": 0,
    "ingresos": 0,
    "gastos": 0,
    "neto": 0,
    "pasivo_patrimonio_neto": 0
  },
  "rev": 4,
  "root_cid": "bafkrei..."
}
```

Cada guardado actualiza el **CID** del snapshot del negocio (rastro content-addressable).

---

## 6. Inventario

### `GET /inventory`

### `POST /inventory`

Campos: `name`, `qty`, `price`, `cost`, `unit`, `category`, `sku`.

---

## 7. Nómina

### `GET /payroll/employees` · `POST /payroll/employees`

### `GET /payroll/payslips` · `POST /payroll/payslips`

Campos de nómina: `employee_id`, `period` (`YYYY-MM`), `gross`, `deductions`, `net`, `status`.

---

## 8. Facturación

### `GET /invoices`

### `POST /invoices`

```json
{
  "client_name": "Cliente Ejemplo",
  "client_tax": "",
  "lines": [
    { "description": "Servicio", "qty": 1, "unit_price": 100 }
  ],
  "tax": 0,
  "status": "issued",
  "issued_at": "2026-09-20"
}
```

Si `status` es `issued` o `paid`, el servidor:

1. Calcula subtotal y total  
2. Asigna número y **CID** de la factura  
3. **Publica un asiento de ingreso** (Caja + Ingresos por ventas)  
4. Devuelve `factura`, `asiento` y `ecuacion`

### `GET /invoices/pdf?id=<uuid>`

Descarga **PDF** imprimible con:

- Nombre y datos del negocio  
- Número, fecha, cliente  
- Líneas, subtotal, impuestos, total  
- CID de la factura  

Respuesta: `Content-Type: application/pdf`  
Requiere vista `facturas` y el mismo Bearer token.

Ejemplo:

```bash
curl -OJ -H "Authorization: Bearer $TOKEN" \
  "https://abacophy.onrender.com/api/v1/invoices/pdf?id=<ID>"
```

---

## 9. Reportes

### `GET /reports/summary`

Totales de ingresos/gastos/neto, inventario, facturas y bloque **`ecuacion`** (ecuación ampliada).

---

## 10. Sincronización offline-first

### `GET /sync`

Snapshot completo del tenant (`rev`, `root_cid`, `snapshot`).

### `POST /sync/push`

Empuje de colas generadas sin red:

```json
{
  "entries": [],
  "invoices": [],
  "inventory": [],
  "client_rev": 0
}
```

---

## 11. Master (instancia)

### `GET /master/tenants`

Lista de negocios.

### `POST /master/tenants/create`

```json
{
  "name": "Tienda Centro",
  "slug": "el-centro",
  "currency": "CUP",
  "admin_user": "admin",
  "admin_pass": "<secreto>"
}
```

Crea plan de cuentas por defecto y usuario administrador del nuevo negocio.

---

## 12. Persistencia y Alset

| Capa | Uso |
|------|-----|
| Disco local (`ABACOPHY_DATA`) | Fuente de verdad del proceso |
| CID (`root_cid`) | Huella content-addressable de cada revisión |
| Cloudflare KV / edge | Réplica opcional vía `ABACOPHY_DO_URL` |
| Alias ANS | `abacophy.app.ans` en nodo Alset (`/w/abacophy.app.ans`) |

El token de sesión es análogo a una **credencial de agente**: no abre el monolito entero, solo las secciones (`views`) que el rol autoriza.

---

## Códigos HTTP frecuentes

| Código | Significado |
|--------|-------------|
| 200 / 201 | OK / creado |
| 400 | Cuerpo inválido |
| 401 | Sin token o token vencido |
| 403 | Rol sin permiso para la vista |
| 404 | Recurso o negocio inexistente |
| 409 | Conflicto (p. ej. slug duplicado) |

---

## Ejemplo mínimo (Bash)

```bash
BASE=https://abacophy.onrender.com/api/v1
TOKEN=$(curl -s -X POST "$BASE/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"username":"...","password":"..."}' | jq -r .token)

curl -s "$BASE/reports/summary" -H "Authorization: Bearer $TOKEN" | jq .
```

Las credenciales de arranque **no** se documentan en este archivo; ver `LOGIN.md` (uso interno).


## Nómina PDF

`GET /api/v1/payroll/pdf?period=AAAA-MM` (o `all`)  
Respuesta: `application/pdf` (formato Carta). Requiere vista `nomina`.

## Cuentas T (todas)

`GET /api/v1/accounts/t/all`  
Lista cuentas con movimientos numerados por orden de ejecución de asientos.

## Master · reinicio de fábrica

`POST /api/v1/master/reset`  
Body: `{ "confirm": "REINICIAR" }`  
Solo rol `master`. Borra todos los tenants y vuelve a bootstrap (demo + claves de LOGIN.md).

## Errores de sistema

`GET /api/v1/errors` — solo master; lista incidencias capturadas.  
`POST /api/v1/errors` — el cliente/API puede registrar fallos de forma autónoma (también se anotan en traza vía auditoría).
