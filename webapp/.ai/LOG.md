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
