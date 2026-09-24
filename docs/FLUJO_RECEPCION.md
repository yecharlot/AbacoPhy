# Módulo Informe de recepción (desacoplable)

## Principio modular
- `recepcion` y `almacen` son módulos opcionales del tenant (`EnabledModules`).
- Se activan/desactivan desde master sin romper contabilidad core.
- No se mezcla creación del IR con entrada física: evita stock fantasma.

## Roles
| Acción | Rol |
|--------|-----|
| Registrar informe de recepción | **económico** (admin/master supervisión) |
| Ver pendientes / notificaciones | económico, **almacenero**, admin, master |
| Dar entrada física al almacén | **almacenero** (admin/master) |

## Datos del informe
### Con factura (`has_invoice: true`)
- Fecha, proveedor (obligatorio), nº factura, quién recibe
- Por línea: producto (código), unidad de medida, cantidad, costo unitario, importe

### Sin factura (`has_invoice: false`)
- Fecha, quién recibe, proveedor opcional
- Mismas líneas de producto

## Flujo
1. Económico → `POST /api/v1/receptions` → status `pendiente_entrada`
2. Backend → asiento cuenta **Inventario** (no sube stock de almacén aún)
3. Almacén ve `pending_count` / lista `?status=pendiente_entrada`
4. Almacenero valida con el económico → `POST /api/v1/receptions/enter` `{ id, accept: true }`
5. Status `entrado` → stock físico + promedio ponderado en almacén

## API
- `GET /api/v1/receptions?status=pendiente_entrada`
- `POST /api/v1/receptions`
- `POST /api/v1/receptions/enter`
