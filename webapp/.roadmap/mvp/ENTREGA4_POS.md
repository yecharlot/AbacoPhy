# Entrega 4 — POS (punto de venta)

## Flujo completo Almacén → POS
1. Catálogo: producto
2. Almacén: unidad de venta
3. Recepción: stock central
4. Transferencia: stock en unidad
5. **POS**: venta → descuenta stock unidad (o almacén si no hay unidad)

## API
`POST /pos/sales` → `{ unit_id?, seller?, date?, note?, lines: [{ product_id, qty, unit_price?, discount_pct? }] }`

## Criterio
- [x] Formulario venta alineado
- [x] Precio sugerido desde catálogo
- [x] Validación stock en unidad (UI)
- [x] Historial + KPIs/gráficas
