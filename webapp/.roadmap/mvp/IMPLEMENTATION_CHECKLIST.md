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
| [ ] | `infrastructure/data/http` — cliente HTTP base (base URL, JSON, errores tipados) | Unit: construye request, mapea 401/403/5xx |
| [ ] | Interceptor / helper de `Authorization: Bearer` | Unit: adjunta token si existe sesión |
| [ ] | Detección básica online/offline (`navigator.onLine` + eventos) | Unit o smoke: flag de red |
| [ ] | `infrastructure/data/storage` — abstracción mínima (token, preferencias) | Unit: get/set/clear |
| [ ] | `infrastructure/ui/theme` — tokens CSS claro/oscuro | Smoke visual |
| [ ] | `infrastructure/ui/shared` — Button, Card, Input, Toast, Badge, Money (mínimo viable) | Smoke visual |
| [ ] | `infrastructure/ui/shell` — AppShell + Sidebar + Topbar (menú filtrable por views) | Smoke: render sin sesión / con sesión mock |
| [ ] | `infrastructure/di` — composición raíz (http, storage) | Wiring manual verificable |
| [ ] | Router mínimo o estado de “pantalla activa” en app shell | Navegación entre 2 pantallas dummy |
| [ ] | `npm run check` en verde tras scaffold de carpetas | CI local |

**Dependencias npm nuevas (solo si se aprueban en LOG):** ninguna obligatoria en esta fase. Vitest cuando llegue el primer test.

---

## 1. Feature `identity`

**Idea:** acceso al sistema, sesión, cierre, cambio de clave. Sin esto no hay ACL ni menú real.

### Domain

| Ítem | Use case / entidad | Tests |
|------|--------------------|-------|
| [ ] | Entidades: `User`, `Session` (token, expires, role, tenantId, views, modules) | Unit tipos / invariantes mínimas |
| [ ] | Contrato `AuthRepository` | — |
| [ ] | `Login` | Unit: credenciales → Session; error → mensaje dominio |
| [ ] | `Logout` | Unit: limpia sesión |
| [ ] | `GetMe` / restaurar sesión | Unit: token válido → Session; inválido → unauthenticated |
| [ ] | `ChangePassword` | Unit: validación mínima (longitud); éxito/error |

### Data

| Ítem | Descripción | Tests |
|------|-------------|-------|
| [ ] | DTOs login / me / password | Mapper unit |
| [ ] | `AuthRemoteSource` → `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`, `POST /auth/password` | Mock HTTP |
| [ ] | `AuthRepositoryImpl` | Unit con source mock |
| [ ] | Persistencia local del token (storage) | Unit |

### UI

| Ítem | Descripción | Prueba |
|------|-------------|--------|
| [ ] | `sessionStore` — estados visuales idle/loading/success/error | Unit store + use case mock |
| [ ] | `LoginScreen` + formulario | Smoke: login OK / 401 |
| [ ] | Guard de sesión en shell (redirigir a login) | Smoke |
| [ ] | Acción salir | Smoke |

### DI

| Ítem | Descripción |
|------|-------------|
| [ ] | `identity/di` cablea source → repo → use cases → store |

---

## 2. Feature `tenant`

**Idea:** datos del negocio visibles en shell y en PDFs posteriores.

| Ítem | Use case / pieza | Tests / prueba |
|------|------------------|----------------|
| [ ] | Entidad `Tenant` | Unit |
| [ ] | `GetTenant` / `UpdateTenant` | Unit |
| [ ] | Contrato + impl → `GET/PUT /tenant` | Mapper + mock |
| [ ] | Screen “Negocio” (lectura/edición básica) | Smoke (rol con vista `tenant`) |
| [ ] | Store UI con estados estándar | Unit store |

---

## 3. Feature `accounting` (núcleo MVP)

**Idea:** dashboard con ecuación, ingresos, gastos, plan de cuentas, listado de asientos, resumen.

### Domain

| Ítem | Use case / entidad | Tests |
|------|--------------------|-------|
| [ ] | Entidades: `Account`, `Entry`, `Equation` | Unit |
| [ ] | `ListAccounts` | Unit |
| [ ] | `CreateIncomeEntry` | Unit (orquesta repo; no calcula partida doble en cliente si el backend ya la aplica — documentar decisión en LOG) |
| [ ] | `CreateExpenseEntry` | Unit |
| [ ] | `ListEntries` | Unit |
| [ ] | `GetSummary` (incluye bloque ecuación) | Unit |

### Data

| Ítem | Endpoints | Tests |
|------|-----------|-------|
| [ ] | `/accounts`, `/entries`, `/reports/summary` | Mappers + mock |

### UI

| Ítem | Screen / componente | Prueba |
|------|---------------------|--------|
| [ ] | `DashboardScreen` — totales + ecuación | Smoke con API o fixture |
| [ ] | `IngresosScreen` — alta + feedback | Smoke |
| [ ] | `GastosScreen` — alta + feedback | Smoke |
| [ ] | `CuentasScreen` — listado | Smoke |
| [ ] | `ReportesScreen` o sección en dashboard | Smoke |
| [ ] | Componentes: `EntryForm`, `EquationCard`, `AccountTable` | Smoke |

### DI

| Ítem |
|------|
| [ ] | `accounting/di` completo |

**Nota de dominio:** la partida doble y la ecuación las resuelve el backend. El frontend muestra y envía intenciones; no reimplementar el motor contable en Svelte salvo validaciones de formulario (importe > 0, cuenta requerida).

---

## 4. Feature `invoicing`

**Idea:** emitir factura, listar, descargar PDF.

| Ítem | Use case / pieza | Tests / prueba |
|------|------------------|----------------|
| [ ] | Entidades `Invoice`, `InvoiceLine` | Unit |
| [ ] | `ListInvoices`, `EmitInvoice`, `DownloadInvoicePdf` | Unit (PDF: no parsear binario; verificar llamada) |
| [ ] | Data → `/invoices`, `/invoices/pdf` | Mapper + mock |
| [ ] | `FacturasScreen` + formulario líneas | Smoke |
| [ ] | Botón PDF abre/descarga blob | Smoke manual |

---

## 5. Feature `payroll` (MVP reducido)

**Idea:** trabajadores + liquidaciones; tasas cubanas las aplica el backend.

| Ítem | Use case / pieza | Tests / prueba |
|------|------------------|----------------|
| [ ] | Entidades `Employee`, `Payslip` | Unit |
| [ ] | `ListEmployees`, `CreateEmployee`, `ListPayslips`, `CreatePayslip` | Unit |
| [ ] | Data → `/payroll/employees`, `/payroll/payslips` | Mapper + mock |
| [ ] | Screens listado/alta (sin UI de todas las tasas avanzadas si no hace falta) | Smoke |
| [ ] | PDF nómina — | opcional MVP+ |

---

## 6. Feature `sync` (MVP offline mínimo)

**Idea:** no perder capturas sin red; badge de estado.

| Ítem | Use case / pieza | Tests / prueba |
|------|------------------|----------------|
| [ ] | Entidades cola: operaciones pendientes + `client_rev` | Unit |
| [ ] | `EnqueueOperation`, `PushQueue`, `PullSnapshot` | Unit con storage + repo mock |
| [ ] | Data → `GET /sync`, `POST /sync/push` | Mock |
| [ ] | Integración: si offline, `CreateIncomeEntry` encola en lugar de fallar en silencio | Unit integración feature accounting↔sync (contrato) |
| [ ] | Badge de red en shell | Smoke |

---

## 7. Feature `catalog` (MVP opcional temprano)

Solo si se necesita para inventario/POS en la misma oleada.

| Ítem | Estado MVP |
|------|------------|
| [ ] | Productos CRUD mínimo | — o incluir si warehouse/pos entran |
| [ ] | Unidades de medida | — |
| [ ] | Monedas (lectura) | — |

---

## 8. Features fuera de MVP inicial

No implementar hasta cerrar fases 0–6 (o 0–5 sin offline formal).

| Feature | Motivo de aplazamiento |
|---------|------------------------|
| — warehouse / recepción / transferencias | Ops comerciales fase 2 |
| — pos | Depende de catalog + warehouse |
| — costing (fichas costo/precio) | Fase 2 |
| — commerce (pedidos online, tienda) | Opcional producto |
| — audit (traza, salvas CID UI) | Gobernanza fase 2 |
| — master (tenants, reset, modules admin) | Solo rol plataforma |

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
