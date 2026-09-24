# Entrega 1 — Almacén → POS (cimientos)

## A1 · Contratos API (rama webapp)

| Acción | Método | Path | Body / notas | Store |
|--------|--------|------|--------------|-------|
| Listar productos | GET | `/products` | `{ products }` | `catalogStore.loadAll` |
| Alta producto | POST | `/products` | `name` (req), `code?`, `unit`, `category`, `cost_std`, `price_sale` | `addProduct` |
| Editar producto | PUT | `/products` | `id` + campos | `editProduct` |
| Stock almacén | GET | `/warehouse` | filas `product_id`, `qty`, `avg_cost`… | `warehouseStore.loadAll` |
| Unidades | GET | `/units` | `{ units, stocks }` | idem |
| Alta unidad | POST | `/units` | `name` (req), `address?`, `phone?` | `addSalesUnit` |
| Recepciones | GET/POST | `/receptions` | líneas `product_id`, `qty`, `unit_cost` | Entrega 2 |
| Transferencias | GET/POST | `/transfers` | `unit_id` + líneas | Entrega 3 |
| POS | GET/POST | `/pos/sales` | `unit_id` + líneas | Entrega 4 |

**ACL ViewACL:** `productos`/`nomencladores`, `almacen`, `unidades`, `recepcion`, `vendedor`.

## Criterio Entrega 1

- [x] Crear producto desde UI Catálogo
- [x] Ver stock almacén (tabla; vacío si no hay recepciones)
- [x] Crear unidad de venta desde Almacén
- [x] Documentación de contratos

Siguiente: Entrega 2 Recepciones.
