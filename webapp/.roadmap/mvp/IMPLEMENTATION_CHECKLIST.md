# IMPLEMENTATION_CHECKLIST — MVP Webapp

Checklist de implementación del frontend Svelte (`webapp/`) orientado a **pruebas**.
Basado en la idea de producto ÁbacoPhy (contabilidad PyME, offline-first, roles, módulos), **no** en una copia de la PWA legada.

Leyenda:

- `[ ]` pendiente
- `[~]` en curso
- `[x]` hecho
- `—` fuera de MVP (no implementar aún)

Criterio “hecho” de una feature: use cases listados implementados + tests de domain marcados + smoke manual posible contra API real o mock.

---

## 0. Infrastructure (prerrequisito de todas las features)

Piezas transversales necesarias antes o en paralelo al primer feature usable.

| Ítem | Descripción | Tests / prueba |
|------|-------------|----------------|
| [x]  | `infrastructure/data/http` — cliente HTTP base (base URL, JSON, errores tipados) | Unit: construye request, mapea 401/403/5xx |
| [x]  | Interceptor / helper de `Authorization: Bearer` | Unit: adjunta token si existe sesión |
| [x]  | Detección básica online/offline (`navigator.onLine` + eventos) | Unit o smoke: flag de red |
| [x]  | `infrastructure/data/storage` — abstracción mínima (token, preferencias) | Unit: get/set/clear |
| [x]  | `infrastructure/ui/theme` — tokens CSS claro/oscuro | Smoke visual |
| [x]  | `infrastructure/ui/shared` — Button, Card, Input, Toast, Badge, Money (mínimo viable) | Smoke visual |
| [x]  | `infrastructure/ui/shell` — AppShell + Sidebar + Topbar (menú filtrable por views) | Smoke: render sin sesión / con sesión mock |
| [x]  | `infrastructure/di` — composición raíz (http, storage) | Wiring manual verificable |
| [x]  | Router mínimo o estado de “pantalla activa” en app shell | Navegación entre 2 pantallas dummy |
| [x]  | `npm run check` en verde tras scaffold de carpetas | CI local |

**Dependencias npm nuevas (solo si se aprueban en LOG):** ninguna obligatoria en esta fase. Vitest cuando llegue el primer test.

---

## 1. Feature `identity`

**Idea:** acceso al sistema, sesión, cierre, cambio de clave. Sin esto no hay ACL ni menú real.

### Domain

| Ítem | Use case / entidad | Tests |
|------|--------------------|-------|
| [x]  | Entidades: `User`, `Session` (token, expires, role, tenantId, views, modules) | Unit tipos / invariantes mínimas |
| [x]  | Contrato `AuthRepository` | — |
| [x]  | `Login` | Unit: credenciales → Session; error → mensaje dominio |
| [x]  | `Logout` | Unit: limpia sesión |
| [x]  | `GetMe` / restaurar sesión | Unit: token válido → Session; inválido → unauthenticated |
| [x]  | `ChangePassword` | Unit: validación mínima (longitud); éxito/error |

### Data

| Ítem | Descripción | Tests |
|------|-------------|-------|
| [x]  | DTOs login / me / password | Mapper unit |
| [x]  | `AuthRemoteSource` → `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`, `POST /auth/password` | Mock HTTP |
| [x]  | `AuthRepositoryImpl` | Unit con source mock |
| [x]  | Persistencia local del token (storage) | Unit |

### UI

| Ítem | Descripción | Prueba |
|------|-------------|--------|
| [x]  | `sessionStore` — estados visuales idle/loading/success/error | Unit store + use case mock |
| [x]  | `LoginScreen` + formulario | Smoke: login OK / 401 |
| [x]  | Guard de sesión en shell (redirigir a login) | Smoke |
| [x]  | Acción salir | Smoke |

### DI

| Ítem | Descripción |
|------|-------------|
| [x]  | `identity/di` cablea source → repo → use cases → store |

---

## 2. Feature `tenant`

**Idea:** datos del negocio visibles en shell y en PDFs posteriores.

| Ítem | Use case / pieza | Tests / prueba |
|------|------------------|----------------|
| [x]  | Entidad `Tenant` | Unit |
| [x]  | `GetTenant` / `UpdateTenant` | Unit |
| [x]  | Contrato + impl → `GET/PUT /tenant` | Mapper + mock |
| [x]  | Screen “Negocio” (lectura/edición básica) | Smoke (rol con vista `tenant`) |
| [x]  | Store UI con estados estándar | Unit store |

---

## 3. Feature `accounting` (núcleo MVP)

**Idea:** dashboard con ecuación, ingresos, gastos, plan de cuentas, listado de asientos, resumen.

### Domain

| Ítem | Use case / entidad | Tests |
|------|--------------------|-------|
| [x]  | Entidades: `Account`, `Entry`, `Equation` | Unit |
| [x]  | `ListAccounts` | Unit |
| [x]  | `CreateIncomeEntry` | Unit (orquesta repo; no calcula partida doble en cliente si el backend ya la aplica — documentar decisión en LOG) |
| [x]  | `CreateExpenseEntry` | Unit |
| [x]  | `ListEntries` | Unit |
| [x]  | `GetSummary` (incluye bloque ecuación) | Unit |

### Data

| Ítem | Endpoints | Tests |
|------|-----------|-------|
| [x]  | `/accounts`, `/entries`, `/reports/summary` | Mappers + mock |

### UI

| Ítem | Screen / componente | Prueba |
|------|---------------------|--------|
| [x]  | `DashboardScreen` — totales + ecuación | Smoke con API o fixture |
| [x]  | `IngresosScreen` — alta + feedback | Smoke |
| [x]  | `GastosScreen` — alta + feedback | Smoke |
| [x]  | `CuentasScreen` — listado | Smoke |
| [x]  | `ReportesScreen` o sección en dashboard | Smoke |
| [x]  | Componentes: `EntryForm`, `EquationCard`, `AccountTable` | Smoke |

### DI

| Ítem |
|------|
| [x]  | `accounting/di` completo |

**Nota de dominio:** la partida doble y la ecuación las resuelve el backend. El frontend muestra y envía intenciones; no reimplementar el motor contable en Svelte salvo validaciones de formulario (importe > 0, cuenta requerida).

---

## 4. Feature `invoicing`

**Idea:** emitir factura, listar, descargar PDF.

| Ítem | Use case / pieza | Tests / prueba |
|------|------------------|----------------|
| [x]  | Entidades `Invoice`, `InvoiceLine` | Unit |
| [x]  | `ListInvoices`, `EmitInvoice`, `DownloadInvoicePdf` | Unit (PDF: no parsear binario; verificar llamada) |
| [x]  | Data → `/invoices`, `/invoices/pdf` | Mapper + mock |
| [x]  | `FacturasScreen` + formulario líneas | Smoke |
| [x]  | Botón PDF abre/descarga blob | Smoke manual |

---

## 5. Feature `payroll` (MVP reducido)

**Idea:** trabajadores + liquidaciones; tasas cubanas las aplica el backend.

| Ítem | Use case / pieza | Tests / prueba |
|------|------------------|----------------|
| [x]  | Entidades `Employee`, `Payslip` | Unit |
| [x]  | `ListEmployees`, `CreateEmployee`, `ListPayslips`, `CreatePayslip` | Unit |
| [x]  | Data → `/payroll/employees`, `/payroll/payslips` | Mapper + mock |
| [x]  | Screens listado/alta (sin UI de todas las tasas avanzadas si no hace falta) | Smoke |
| [x]  | PDF nómina — | opcional MVP+ |

---

## 6. Feature `sync` (MVP offline mínimo)

**Idea:** no perder capturas sin red; badge de estado.

| Ítem | Use case / pieza | Tests / prueba |
|------|------------------|----------------|
| [x]  | Entidades cola: operaciones pendientes + `client_rev` | Unit |
| [x]  | `EnqueueOperation`, `PushQueue`, `PullSnapshot` | Unit con storage + repo mock |
| [x]  | Data → `GET /sync`, `POST /sync/push` | Mock |
| [x]  | Integración: si offline, `CreateIncomeEntry` encola en lugar de fallar en silencio | Unit integración feature accounting↔sync (contrato) |
| [x]  | Badge de red en shell | Smoke |

---

## 7. Feature `catalog` (MVP opcional temprano)

Solo si se necesita para inventario/POS en la misma oleada.

| Ítem | Estado MVP |
|------|------------|
| [x] | Productos CRUD mínimo | — o incluir si warehouse/pos entran |
| [x] | Unidades de medida | — |
| [x] | Monedas (lectura) | — |

---

## 8. Ops comerciales, comercio y gobernanza

Desbloqueada tras cerrar las fases 0–7. Implementada en la rama `webapp`.

| Ítem | Feature / piezas | Endpoints | Estado |
|------|------------------|-----------|--------|
| [x] | `warehouse` — existencias, unidades de venta, recepción, transferencias | `GET /warehouse`, `GET/POST /units`, `GET/POST /receptions`, `GET/POST /transfers` | Pantallas Almacén, Recepción, Transferencias |
| [x] | `pos` — venta de mostrador con rebaja por línea | `GET/POST /pos/sales` | Pantalla Punto de venta |
| [x] | `costing` — fichas de costo y de precio | `GET/POST /cost-sheets`, `GET/POST/DELETE /price-sheets` | Pantallas Fichas de costo y Fichas de precio |
| [x] | `commerce` — pedidos online y cambio de estado | `GET/POST/PUT /online-orders` | Pantalla Pedidos online |
| [x] | `audit` — traza, incidencias, salvas CID | `GET /audit`, `GET/POST /backups`, `POST /backups/restore`, `GET /backups/export`, `GET /errors` | Pantallas Traza y Salvas |
| [x] | `master` — módulos, negocios, reinicio, usuarios | `GET/PUT /modules`, `GET /master/tenants`, `POST /master/tenants/create`, `POST /master/reset`, `GET/POST/PUT/DELETE /users` | Pantallas Master y Usuarios |
| [ ] | Tests de domain (Vitest) de los use cases de fase 8 | — | Pendiente |

**Reglas respetadas:** ninguna regla contable en `.svelte`; comunicación entre features solo por contratos de `domain/`; DI manual por feature; menú filtrado por `views` del backend.

Fuera de alcance por ahora:

| Feature | Motivo |
|---------|--------|
| — tienda / catálogo público | Producto, no MVP interno |

---

## Orden de ejecución recomendado

```text
0 Infrastructure
    → 1 identity
        → 2 tenant (puede ir en paralelo ligero con 3)
            → 3 accounting
                → 4 invoicing
                → 5 payroll (paralelo a 4 si hay capacidad)
                    → 6 sync (endurecer offline sobre ingresos/gastos ya existentes)
```

---

## Criterios de aceptación globales del MVP frontend

- [ ] Login / logout / restauración de sesión funcionan contra API real de desarrollo.
- [ ] Menú lateral solo muestra vistas permitidas por rol (fixture de `views`).
- [ ] Dashboard muestra ecuación ampliada devuelta por el backend.
- [ ] Se puede registrar un ingreso y un gasto y ver reflejo en resumen tras refresh o respuesta.
- [ ] Tema claro/oscuro usable.
- [ ] `npm run check` pasa.
- [ ] Domain de identity + accounting tiene tests unitarios de use cases críticos.
- [ ] LOG actualizado en cada entrega parcial.
- [ ] Ningún component `.svelte` contiene reglas contables ni `fetch` directo a endpoints de negocio.

---

## Cómo usar este archivo

1. Marcar `[~]` al empezar un bloque.
2. Marcar `[x]` solo cuando use cases + tests mínimos del bloque estén hechos.
3. Anotar desviaciones en `.ai/LOG.md` (fecha + decisión).
4. No añadir features de la sección 8 sin actualizar este checklist y AGENTS.md.
