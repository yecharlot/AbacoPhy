# LOG — ÁbacoPhy Webapp

Registro cronológico de implementaciones y decisiones del módulo `webapp/`.
Cada entrada relevante debe incluir: fecha, qué se hizo, por qué, archivos tocados y decisiones abiertas.

---

## 2026-09-21 — Rediseño visual: capa de gráficos y tableros

### Qué

- Nueva librería de gráficos propia en `infrastructure/ui/charts/` (sin dependencias npm):
  `chartTypes.ts` (geometría y formato tipados), `DonutChart`, `BarChart`, `LineChart`,
  `StatCard` (variantes hero / plain / positive / negative) y `PanelCard`.
- Tableros con gráficos sobre datos reales del backend, por feature:
  - `accounting` — patrimonio neto en tarjeta hero, ingresos/gastos con variación mes a mes,
    flujo mensual de ingresos (barras), reparto de gastos por categoría (donut),
    tendencia de gastos (línea), estructura de cuentas por tipo (donut) y movimientos recientes.
  - `warehouse` — valor en almacén y en unidades, productos de mayor valor (barras),
    distribución almacén vs. unidades (donut) y entradas por recepción.
  - `pos` — ventas acumuladas, margen y costo; ventas por día (línea), por unidad (donut)
    y productos más vendidos (barras).
  - `commerce` — importe total y pendiente; pedidos por estado (donut), importe por estado
    y productos más pedidos (barras).
  - `costing` — costo unitario promedio y precio sugerido; estructura de la ficha activa (donut),
    ranking de costo por producto y margen por producto en fichas de precio.
- Agregaciones en `ui/viewmodels/` por feature (`dashboardCharts`, `warehouseCharts`,
  `posCharts`, `commerceCharts`, `costingCharts`): funciones puras y tipadas que solo agrupan
  y formatean lo que devuelve el backend.

### Por qué

- Referencia visual aportada por el equipo (tablero oscuro con tarjeta hero en degradado,
  tarjetas de métricas, barras, donut y lista de transacciones). Los tokens de `theme/tokens.css`
  ya seguían esa línea; faltaba la capa de visualización y la composición de secciones.

### Decisiones

- **Gráficos propios en SVG/CSS**, sin Chart.js ni D3: cero dependencias nuevas, control total
  de los tokens del tema y del comportamiento responsive.
- **Las agregaciones viven en `ui/viewmodels/`, no en `domain/`**: agrupar asientos por mes o
  gastos por categoría es presentación, no regla contable. Ningún gráfico recalcula partida doble,
  ecuación, costo unitario ni promedio ponderado; todo eso sigue llegando del backend Go.
- Los componentes de gráfico reciben `ChartPoint[]`, un contrato único y tipado, por lo que
  cualquier pantalla futura puede alimentarlos sin tocar su implementación.
- Responsive: una columna por defecto; dos columnas desde 900 px; valores numéricos de las barras
  se ocultan bajo 600 px; gráficos con `viewBox` y ancho fluido.

### Verificación

- `npx vite build` compila la aplicación completa (341 módulos) sin errores.
- `svelte-check` mantiene los mismos 8 errores previos de `accounting`/`invoicing` por archivos
  ausentes en la rama; el rediseño no añade ninguno.

---

## 2026-09-21 — Fase 8: warehouse, pos, costing, commerce, audit y master

### Qué

- Implementadas las seis features de la sección 8 del checklist, solo frontend, sobre la rama `webapp`:
  - `warehouse` — existencias de almacén central, unidades de venta, informes de recepción y transferencias almacén → unidad.
  - `pos` — venta de mostrador con líneas, precio por producto, rebaja por línea e historial de ventas.
  - `costing` — fichas de costo (MP, auxiliares, energía, salario directo, otros, indirectos) y fichas de precio (costo referencia + margen).
  - `commerce` — pedidos online: alta, filtro por estado y cambio de estado (pendiente / confirmado / entregado / cancelado).
  - `audit` — traza de operaciones con búsqueda, incidencias del sistema (solo master), salvas CID: crear, restaurar y exportar ZIP.
  - `master` — módulos habilitados por negocio, listado y alta de negocios, reinicio de fábrica y CRUD de usuarios con roles.
- Cada feature con las cuatro capas (`domain/`, `data/`, `ui/`, `di/`), DI manual y stores con estado visual `idle | loading | success | error | empty`.
- Navegación: once ítems nuevos en `navTypes.ts` filtrados por `views` del backend (`almacen`, `recepcion`, `vendedor`, `fichas_costo`, `fichas_precio`, `pedidos_online`, `traza`, `salvas`, `usuarios`, `master`) y sus títulos en `app/navigation.ts`.

### Por qué

- Cierre de las fases 0–7; la sección 8 pasa de aplazada a implementada por decisión del equipo.
- Los DTOs se tiparon leyendo los handlers Go (`internal/api/ops.go`, `modules_handlers.go`, `extra.go`, `server.go`) y los structs de `internal/domain`, porque `API.md` no documenta todas las respuestas (`/audit`, `/backups`, `/modules`, `/users`, `/online-orders`).

### Archivos

| Ruta | Acción |
|------|--------|
| `webapp/src/features/warehouse/**` | Creado |
| `webapp/src/features/pos/**` | Creado |
| `webapp/src/features/costing/**` | Creado |
| `webapp/src/features/commerce/**` | Creado |
| `webapp/src/features/audit/**` | Creado |
| `webapp/src/features/master/**` | Creado |
| `webapp/src/features/catalog/di/catalogModule.ts` | Modificado (expone `repository` como contrato de dominio) |
| `webapp/src/app/App.svelte` | Modificado (composición y ruteo de las seis features) |
| `webapp/src/app/navigation.ts` | Modificado (títulos de pantalla) |
| `webapp/src/infrastructure/ui/shell/navTypes.ts` | Modificado (ítems de menú por `views`) |

### Decisiones

- **Comunicación entre features solo por contratos de domain.** `catalogModule` y `warehouseModule` exponen su `repository` tipado como interfaz; `pos`, `costing` y `commerce` reciben esos contratos por parámetro en su `di/`. Ninguna feature importa la capa `data/` de otra.
- **Cero reglas de negocio en el frontend.** Promedio ponderado, partida doble, costo de venta, cálculo de costo unitario y precio sugerido (margen 30 %) quedan en el backend. Los use cases solo validan formulario: cantidad > 0, producto requerido, rebaja 0–100 %, importes no negativos, `confirm=REINICIAR` en el reinicio de fábrica.
- **Exportación de salvas** usa `httpClient.getBlob` ya existente (el mismo camino del PDF de facturas); la descarga al disco la hace la pantalla, el repositorio devuelve `Blob`.
- **Unidades de venta** viven en `warehouse` y no en `catalog`: `catalog` ya ocupa `/measure-units` (unidades de medida) y el endpoint `/units` pertenece al flujo de almacén y POS.
- Sin dependencias npm nuevas.

### Bloqueos / seguimiento

- `npm run check` sigue reportando **8 errores previos a esta entrega**, todos fuera de fase 8: faltan en la rama `features/accounting/data/dto/EntryDto.ts`, `features/invoicing/domain/entities/InvoiceLine.ts`, `features/invoicing/data/repositories/InvoicingRepositoryImpl.ts` y `features/invoicing/ui/stores/invoicingStore.ts` (parecen no commiteados). Las features de fase 8 no añaden ningún error ni warning nuevo.
- Tests de domain (Vitest) pendientes para los use cases de fase 8, igual que en las fases anteriores.

---

## 2026-09-21 — Bootstrap de gobernanza del frontend

### Qué

- Creación de la documentación interna del módulo web (contribución frontend únicamente).
- `AGENTS.md`: arquitectura Feature-First + Clean Architecture, convenciones, estructura de carpetas, reglas de dependencias, testing, UI/UX, Git y comportamiento del agente.
- `.ai/LOG.md`: este archivo (plantilla de registro).
- `.roadmap/mvp/IMPLEMENTATION_CHECKLIST.md`: checklist MVP por features, use cases y piezas de infrastructure necesarias para pruebas.

### Por qué

- La plantilla en `webapp/` es Svelte 5 + Vite 8 + TypeScript (scaffold por defecto).
- Se necesita un contrato claro antes de escribir código de features, para no repetir el monolito de `static/app`.
- El alcance de esta contribución es solo frontend; el backend Go se consume vía API REST.

### Archivos

| Ruta | Acción |
|------|--------|
| `webapp/AGENTS.md` | Creado |
| `webapp/.ai/LOG.md` | Creado |
| `webapp/.roadmap/mvp/IMPLEMENTATION_CHECKLIST.md` | Creado |

### Decisiones

- **No copiar** la PWA legada; solo la idea de producto (contabilidad PyME, offline-first, roles, módulos).
- Inyección de dependencias **manual** en `di/` por feature.
- Testing: priorizar domain/use cases; Vitest se introducirá cuando se implemente el primer use case testeable.
- Router: aplazado; shell temporal en `App.svelte` hasta fase de rutas.
- Intento de push al repo `yecharlot/AbacoPhy` vía conector GitHub: **403** (sin permiso de escritura). Artefactos generados en workspace local del colaborador para copiar/subir manualmente o tras ampliar permisos del conector.

### Siguiente paso sugerido

1. Subir estos tres archivos a `webapp/` en el repo (PR o push con permisos).
2. Fase 0 del checklist: infrastructure (HTTP client, theme tokens, shell mínimo) + feature `identity` (login / sesión).

---

## 2026-10-24 — Implementación del Feature 7: Catalog (Catálogo / Nomencladores)

### Qué
- Implementación completa de la arquitectura Clean + Feature-First para la característica de Catálogo (`catalog`).
- Creación de entidades de dominio: `Product`, `MeasureUnit` y `Currency`.
- Implementación de los casos de uso (`GetProducts`, `CreateProduct`, `UpdateProduct`, `GetMeasureUnits`, `CreateMeasureUnit`, `DeleteMeasureUnit`, `GetCurrencies`).
- Capa de datos con DTOs, mappers (`catalogMapper`), fuente remota (`CatalogRemoteSource`) e implementación del repositorio (`CatalogRepositoryImpl`).
- Interfaz de usuario reactiva en Svelte 5 (`CatalogScreen.svelte`) organizada en pestañas utilizando los runes `$state` y `$derived`.
- Integración en la navegación global y el shell de la aplicación (`App.svelte` y `navigation.ts`).

### Por qué
- Habilitar el mantenimiento del catálogo de productos y nomencladores base como prerrequisito para las futuras pantallas de inventario, facturación avanzada y POS.
- Seguir los lineamientos estrictos de `AGENTS.md` (Clean Architecture, Feature-First, inyección manual, idioma inglés en código y español en UI).

### Archivos
| Ruta | Acción |
|------|--------|
| `webapp/src/features/catalog/domain/entities/Product.ts` | Creado |
| `webapp/src/features/catalog/domain/entities/MeasureUnit.ts` | Creado |
| `webapp/src/features/catalog/domain/entities/Currency.ts` | Creado |
| `webapp/src/features/catalog/domain/repositories/CatalogRepository.ts` | Creado |
| `webapp/src/features/catalog/domain/usecases/*` | Creados |
| `webapp/src/features/catalog/data/dto/CatalogDto.ts` | Creado |
| `webapp/src/features/catalog/data/mappers/catalogMapper.ts` | Creado |
| `webapp/src/features/catalog/data/sources/CatalogRemoteSource.ts` | Creado |
| `webapp/src/features/catalog/data/repositories/CatalogRepositoryImpl.ts` | Creado |
| `webapp/src/features/catalog/ui/stores/catalogStore.ts` | Creado |
| `webapp/src/features/catalog/ui/screens/CatalogScreen.svelte` | Creado |
| `webapp/src/features/catalog/di/catalogModule.ts` | Creado |
| `webapp/src/infrastructure/ui/shell/navTypes.ts` | Modificado |
| `webapp/src/app/navigation.ts` | Modificado |
| `webapp/src/app/App.svelte` | Modificado |
| `webapp/.roadmap/mvp/IMPLEMENTATION_CHECKLIST.md` | Modificado |

### Decisiones
- Se separó la vista en tres pestañas dinámicas modernas dentro de la misma pantalla `CatalogScreen.svelte`.
- El manejo de errores delega al estado visual del store para respetar la especificación de `idle | loading | success | error | empty`.

---

## 2024-10-27 — Implementación Fases 3, 4 y 5: Accounting, Invoicing y Payroll

### Qué
- Consolidación de extremo a extremo de las características contables, facturación y nómina.
- **Accounting:** Dashboard con ecuación contable, registro de ingresos/gastos, plan de cuentas y reportes.
- **Invoicing:** Listado de facturas, emisión con líneas de detalle y descarga de PDF.
- **Payroll:** Gestión de empleados y procesamiento de liquidaciones de nómina.
- Arquitectura Clean: Entidades, Casos de Uso, Repositorios (Impl + Remote Source), Mappers y Stores UI.
- Integración global en `App.svelte` con navegación filtrada por permisos.

### Por qué
- Completar el núcleo funcional del MVP según el roadmap definido.
- Asegurar la consistencia arquitectónica y el cumplimiento de las reglas de gobernanza en `AGENTS.md`.

### Archivos
| Ruta | Acción |
|------|--------|
| `webapp/src/features/accounting/**/*` | Creados |
| `webapp/src/features/invoicing/**/*` | Creados |
| `webapp/src/features/payroll/**/*` | Creados |
| `webapp/src/infrastructure/ui/shell/navTypes.ts` | Modificado |
| `webapp/src/app/navigation.ts` | Modificado |
| `webapp/src/app/App.svelte` | Modificado |

### Decisiones
- Se eliminaron archivos legacy y duplicados en las carpetas de las features para evitar conflictos de tipos.
- Se ajustaron los tipos de entrada en los componentes compartidos (`Input`) para manejar strings y evitar errores de asignación de Svelte 5.
- La navegación se expandió para incluir todas las nuevas pantallas operativas.

---

## 2026-09-26 — Alineación de facturación, nómina y resumen operativo

### Qué

- La descarga de factura ahora consume el PDF autoritativo de `GET /invoices/pdf`; se retiró la generación local alternativa.
- Se completó la cadena Clean Architecture de nómina para `GET /payroll/pdf`: source, repositorio, use case, DI, store y botón por período en Liquidaciones.
- El resumen contable conserva la ecuación y mapea métricas operativas ya expuestas por `GET /reports/summary`: costo de inventario, facturación emitida/cobrada, cantidad de facturas y empleados. Dashboard las muestra sin recalcular datos de negocio.
- Se alineó `GET /entries` con filtros `type`, `from`, `to` y `limit`; contratos frontend aceptan fechas ISO para consumirlos.
- Se corrigieron tipos pendientes de Recepción que impedían validar el frontend.

### Por qué

- La revisión mostró que facturas y nómina ya tenían casi toda la estructura frontend, pero PDF de nómina era un placeholder y factura no llamaba al endpoint backend.
- El backend ya entregaba métricas operativas en summary que no se representaban en la aplicación.
- Los contratos frontend incluían filtros de entradas, pero el handler Go devolvía todo el libro e ignoraba query params.

### Archivos

- `internal/api/server.go`
- `webapp/src/features/accounting/{data,domain,ui}/**`
- `webapp/src/features/invoicing/ui/screens/FacturasScreen.svelte`
- `webapp/src/features/payroll/{data,domain,di,ui}/**`
- `webapp/src/features/warehouse/{domain,ui}/**`
- `webapp/.roadmap/mvp/IMPLEMENTATION_CHECKLIST.md`

### Decisiones

- `/inventory` no se duplica en `warehouse`: esa feature ya usa las rutas operativas canónicas `/warehouse`, `/receptions` y `/transfers`, que entregan stock real y trazabilidad. El endpoint legacy de inventario permanece sin pantalla paralela para evitar dos fuentes de verdad visuales.
- Campos de summary son opcionales en la entidad de ecuación para mantener compatibilidad con despliegues backend que todavía no los envían.

---

<!-- Plantilla para entradas futuras:

## YYYY-MM-DD — Título corto

### Qué
…

### Por qué
…

### Archivos
| Ruta | Acción |
|------|--------|
| … | Creado / Modificado / Eliminado |

### Decisiones
…

### Bloqueos / seguimiento
…

-->
