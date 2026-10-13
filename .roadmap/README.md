# Roadmap ÁbacoPhy — de MVP a software confiable

**Objetivo:** pasar de un producto *demostrable y operativo en escenario controlado* a un sistema que un contador o auditor pueda tratar como **fuente de verdad** bajo cortes de red largos, varios PDV concurrentes y operación diaria real (incl. contextos como Cuba).

**Principio rector:** confiabilidad = no perder dinero ni inventario, no mentir en contabilidad, recuperarse de fallos y poder operarse sin depender de la estabilidad permanente del servidor.

**Alcance del roadmap**

| Capa | Incluida |
|------|----------|
| Backend Go (`/api/v1`) | Sí |
| Webapp (Svelte) | Sí |
| KMP POS (Android / Desktop) | Sí |
| Infra CI / runbooks | Sí |

**Cómo usar este directorio**

1. Leer `00-vision-y-criterios.md` — definición de “listo”.
2. Seguir las fases en orden (`01` → `07`). Cada fase tiene **entrada**, **tareas**, **criterio de salida**.
3. Marcar tareas en el checklist de la fase; no abrir la siguiente fase si el criterio de salida no se cumple.
4. Registrar desviaciones o decisiones en `DECISIONES.md`.

**Estado de partida (baseline MVP)**

- Flujos: recepción → almacén → transferencia → venta POS (web + KMP con outbox).
- Contabilidad / reportes / kardex avanzados.
- Roles, grants UI, gate backend en evolución.
- Offline POS: cola outbox, SSE, toasts de conectividad.
- Backup/export-import y auditoría consultable.

El gap principal residual: **consistencia inventario ↔ caja ↔ libro** cuando la red falla y cuando web + POS escriben a la vez.
