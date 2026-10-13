# Fase 05 — Permisos reales y seguridad de sesión

**Prioridad:** alta  
**Capas:** Backend + Web (+ KMP consume 403)  
**Por qué:** ocultar menús no es seguridad; un cliente manipulado no debe mutar.

## Entrada

- Grants por rol/usuario (API no legacy).
- UI de permisos master/admin.
- `gateOp` en parte de los handlers.

## Tareas

### Backend

| ID | Tarea | Detalle |
|----|--------|---------|
| 05.B1 | Inventario de mutaciones | Lista de POST/PUT/PATCH/DELETE críticos y gate asociado. |
| 05.B2 | Cubrir gaps | Toda mutación de inventario, ventas, precios, backups, usuarios con 403 sin permiso. |
| 05.B3 | Invalidar sesión | Cambio de password / desactivación / cambio fuerte de grants → token inválido. |
| 05.B4 | Audit de seguridad | Eventos: login fallido, 403, restore backup, cambio permisos. |

### Web

| ID | Tarea | Detalle |
|----|--------|---------|
| 05.W1 | UI alineada al grant real | No mostrar acciones que el API rechazará; si 403, mensaje accionable. |
| 05.W2 | onUnauthorized | Ya tipado: limpiar token y volver a login de forma limpia. |

### KMP

| ID | Tarea | Detalle |
|----|--------|---------|
| 05.K1 | Manejo 403 | No reintentar en outbox como si fuera red; marcar REJECTED o “sin permiso”. |
| 05.K2 | Scope vendedor | Solo su PDV; no listar ni mutar otros. |

## Criterio de salida

- [ ] Matriz rol × operación verificada con llamadas API reales.
- [ ] Vendedor no puede crear producto / transferir / restaurar backup vía API.
- [ ] Token invalidado tras eventos definidos en 05.B3.
