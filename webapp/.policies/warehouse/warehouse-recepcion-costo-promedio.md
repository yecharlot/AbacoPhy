# Política de cliente — Costo promedio ponderado vía Recepciones

**Feature:** `warehouse` (pantalla Recepción)  
**Relacionada:** `catalog` (Nomenclador de productos)  
**Fecha:** 2026-09-26  
**Estado:** vigente

## Principio

El **costo promedio ponderado** de cada producto del inventario **solo** se actualiza a partir de los **informes / notas de recepción** (entrada de mercancía al almacén central).

| Origen | ¿Define / modifica el costo promedio? |
|--------|----------------------------------------|
| **Recepción** (líneas con cantidad + costo unitario de esa entrada) | **Sí** — es la fuente de verdad operativa |
| Nomenclador de productos | **No** — solo define código, nombre, UM, categoría |
| Transferencias / POS / facturas | **No** mueven el promedio de costo de compra (salvo reglas futuras documentadas) |

## Cómo se calcula (backend)

El backend aplica el promedio ponderado al **confirmar la entrada** de la recepción:

```text
nuevo_promedio = (stock_actual × promedio_actual + qty_recibida × costo_unitario_recepción)
                 / (stock_actual + qty_recibida)
```

El frontend **no** recalcula el promedio: envía `qty` + `unit_cost` por línea y muestra el `avg_cost` que devuelve el API en stock.

## Responsabilidad del frontend (Recepción)

1. Cada línea de recepción **debe** incluir:
   - `productId` (producto ya definido en el nomenclador)
   - `qty` > 0
   - `unitCost` ≥ 0 (costo unitario de **esa** recepción; obligatorio informar)
2. El costo unitario de la línea es el valor de **esta entrada**, no un “precio de catálogo”.
3. Sugerencia de UI: se puede prellenar con el `avgCost` actual del stock (si existe) como referencia; el usuario lo confirma o corrige según factura/proveedor.
4. No ofrecer alta de productos desde recepción (política del nomenclador).
5. Tras guardar/entrar la recepción, refrescar stock para reflejar el nuevo promedio.

## Relación con Nomenclador

Ver `catalog-nomenclador-productos.md`: el nomenclador **no** edita costos ni precios.  
El costo de compra entra al sistema **solo** por recepciones.

## Fuente de verdad

- **Definición del producto** → Nomenclador  
- **Costo promedio ponderado en inventario** → Recepciones (cálculo en backend)  
- **Visualización del promedio** → Almacén / stock (`avg_cost`)
