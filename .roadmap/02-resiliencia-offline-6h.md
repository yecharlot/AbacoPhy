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
| 02.P1 | ✅ Política de sesión offline | Mientras sesión Active y < 6 h desde última prueba de red exitosa: vender siempre a outbox; no forzar login. |
| 02.P2 | ✅ Escalada a los 6 h (aviso fuerte, no bloqueo) | Tras 6 h sin contacto: aviso fuerte + opción de seguir en modo degradado o bloquear según decisión de negocio (dejar configurable). |
| 02.P3 | ✅ URL / health (blocking solo misconfig; ya en guard) | Fallo de health o misconfig de base URL sí puede mostrar diálogo de recuperación de URL. |

### Datos locales de soporte

| ID | Tarea | Detalle |
|----|--------|---------|
| 02.K1 | ✅ Caché catálogo (Room + fallback; priceSale/effectiveUnitPrice) | Persistir última foto de productos/price-sheets; vender offline con esos precios. |
| 02.K2 | ✅ Caché stock + descuento provisional offline | Último snapshot por `unitId`; ventas offline descuentan **localmente de forma provisional** y reconcilian al sync (documentar que puede haber sobreventa hasta sync). |
| 02.K3 | ✅ Merge remote + pending_local | Nunca vaciar UI por fallo de red; remote → merge local. |
| 02.K4 | ✅ canRegisterNewSale() sin exigir online | Habilitado si hay PDV asignado y stock/caché local; no depende de `Connectivity.Online`. |

### Prueba de fuego

| ID | Tarea | Detalle |
|----|--------|---------|
| 02.T1 | ✅ Runbook en `.roadmap/runbooks/02-backend-caido-pos-offline.md` | Apagar backend → N ventas → transfer web no aplica hasta up → levantar backend → verificar cola, stock, listados. |
| 02.T2 | ⏳ Checklist en runbook (ejecución manual pendiente) | Resultados en `.roadmap/evidencias/` o issue enlazado. |

## Criterio de salida

- [x] Con backend down, el vendedor registra ventas y ve historial local. *(código: outbox + merge + stock provisional)*
- [x] No aparece modal bloqueante de “sin servidor” en sesión activa por puro transport error. *(P1/P3)*
- [x] Al volver el servidor, drenado automático + listados coherentes. *(fase 01 + worker)*
- [ ] Runbook 02.T1 ejecutado al menos una vez en Desktop y una en Android (si aplica). *(doc lista; evidencia manual)*

### Estado fase 02

| ID | Estado |
|----|--------|
| 02.P1–P3 | Hecho |
| 02.K1–K4 | Hecho |
| 02.T1 | Runbook escrito |
| 02.T2 | Pendiente de ejecución firmada |

**Código listo; cierre formal de fase tras 02.T2 en campo.**

## Riesgo residual aceptado (documentar)

Sobrevenda offline hasta sync si dos cajas comparten stock del mismo PDV sin coordinación. Mitigación futura: fase de concurrencia o reserva blanda.
