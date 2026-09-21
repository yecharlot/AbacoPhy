# LOG — ÁbacoPhy Webapp

Registro cronológico de implementaciones y decisiones del módulo `webapp/`.
Cada entrada relevante debe incluir: fecha, qué se hizo, por qué, archivos tocados y decisiones abiertas.

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
