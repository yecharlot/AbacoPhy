# Entrega 3 — Transferencias almacén → unidad

## Flujo
1. Producto en Catálogo + unidad de venta (Entrega 1)
2. Recepción → stock en almacén central (Entrega 2)
3. **Transferencia** → baja stock almacén, sube stock en unidad

## API
`POST /transfers` → `{ unit_id, date?, note?, lines: [{ product_id, qty }] }`

## Criterio
- [x] Formulario con unidad destino y líneas
- [x] Validación stock disponible
- [x] Historial de transferencias
- [x] Feedback OK/error

Siguiente: Entrega 4 POS.
