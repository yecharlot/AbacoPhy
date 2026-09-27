# Módulo Informe de recepción

## Principio modular

`recepcion` y `almacen` son módulos opcionales del tenant (`EnabledModules`). La creación del Informe de recepción está desacoplada de la entrada física.

**Crear un informe no crea existencias físicas ni modifica el costo promedio ponderado.** La entrada física pertenece exclusivamente al flujo de Almacén.

## Roles

| Acción | Rol |
|---|---|
| Registrar informe de recepción | **económico** (admin/master supervisión) |
| Consultar estado de recepciones | **económico, almacenero, admin, master, contador** según ACL |
| Dar entrada física | **almacenero** (admin/master) |
| Reportar problema de entrada | **almacenero** (admin/master) |

## Flujo

1. Económico → `POST /api/v1/receptions`.
2. Backend crea el documento con `int.reception_status=pending_entry`.
3. El informe queda visible para Almacén.
4. **No se modifica `WarehouseStock` ni `AvgCost`.**
5. Almacenero verifica físicamente:
   - `POST /api/v1/receptions/enter` con `accept=true` → entrada confirmada.
   - `POST /api/v1/receptions/enter` con `accept=false` + motivo → problema de entrada.
6. Solo la confirmación actualiza stock y costo promedio.
7. Económico/comprador ve el estado resultante y, si existe problema, el motivo.

## Estados en metadata

```text
int.reception_status = pending_entry
int.reception_status = entry_confirmed
int.reception_status = entry_problem
```

Para problemas:

```text
int.reception_problem_reason = motivo explicado por almacén
int.reception_entry_actor = usuario
int.reception_entry_at = RFC3339
```

El campo legacy `status` se mantiene sincronizado para compatibilidad.

## API

- `GET /api/v1/receptions`
- `GET /api/v1/receptions?status=pendiente_entrada`
- `POST /api/v1/receptions`
- `POST /api/v1/receptions/enter`
  - entrada: `{ "id", "accept": true }`
  - problema: `{ "id", "accept": false, "reason": "..." }`