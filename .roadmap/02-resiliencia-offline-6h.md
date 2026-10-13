# Fase 02 — Resiliencia offline (política 6 h) y datos de soporte

**Prioridad:** máxima  
**Capas:** KMP + Backend (health/SSE)  
**Por qué:** el producto debe seguir vendiendo con red caída sin vaciar listados ni bloquear al vendedor.

## Entrada

- Fase 01 cerrada (idempotencia básica).
- SSE `/api/v1/events`, outbox worker, toasts de feedback.
- Política de sesión: no modal bloqueante por transporte en sesión activa.

## Tareas

### Política (documentar y codificar)

| ID | Tarea | Detalle |
|----|--------|---------|
| 02.P1 | Política de sesión offline | Mientras sesión Active y < 6 h desde última prueba de red exitosa: vender siempre a outbox; no forzar login. |
| 02.P2 | Escalada a los 6 h | Tras 6 h sin contacto: aviso fuerte + opción de seguir en modo degradado o bloquear según decisión de negocio (dejar configurable). |
| 02.P3 | URL / health | Fallo de health o misconfig de base URL sí puede mostrar diálogo de recuperación de URL. |

### Datos locales de soporte

| ID | Tarea | Detalle |
|----|--------|---------|
| 02.K1 | Caché de catálogo + precios | Persistir última foto de productos/price-sheets; vender offline con esos precios. |
| 02.K2 | Caché de stock por PDV | Último snapshot por `unitId`; ventas offline descuentan **localmente de forma provisional** y reconcilian al sync (documentar que puede haber sobreventa hasta sync). |
| 02.K3 | Listado de ventas siempre desde Room | Nunca vaciar UI por fallo de red; remote → merge local. |
| 02.K4 | Botón “Registrar venta” | Habilitado si hay PDV asignado y stock/caché local; no depende de `Connectivity.Online`. |

### Prueba de fuego

| ID | Tarea | Detalle |
|----|--------|---------|
| 02.T1 | Script/runbook 6 h | Apagar backend → N ventas → transfer web no aplica hasta up → levantar backend → verificar cola, stock, listados. |
| 02.T2 | Checklist firmado | Resultados en `.roadmap/evidencias/` o issue enlazado. |

## Criterio de salida

- [ ] Con backend down, el vendedor registra ventas y ve historial local.
- [ ] No aparece modal bloqueante de “sin servidor” en sesión activa por puro transport error.
- [ ] Al volver el servidor, drenado automático + listados coherentes.
- [ ] Runbook 02.T1 ejecutado al menos una vez en Desktop y una en Android (si aplica).

## Riesgo residual aceptado (documentar)

Sobrevenda offline hasta sync si dos cajas comparten stock del mismo PDV sin coordinación. Mitigación futura: fase de concurrencia o reserva blanda.
