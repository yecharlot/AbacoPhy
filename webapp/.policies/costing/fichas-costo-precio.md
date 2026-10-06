# Política — Fichas de costo y fichas de precio

**Feature:** costing  
**Fecha:** 2026-10-06  
**Estado:** vigente  
**Backend:** Fase COST-PRICE-1 (`.backend_log/Log.md`)

## Separación de responsabilidades

| Concepto | Fuente de verdad | Quién |
|----------|------------------|-------|
| Definición del producto | Nomenclador (sin precio/costo editable) | Admin / almacenero según ACL |
| Costo de inventario / COGS | `avg_cost` tras **entrada en almacén** | Almacenero |
| Costo estructurado (análisis) | **Ficha de costo** | Económico / contador |
| Precio de venta oficial | **Ficha de precio** → `product.price_sale` | Económico / admin |
| Canal POS / ventas | `price_sale` (o `unit_price` explícito) | Vendedor consume |

## Ficha de costo

- **No** mueve stock.
- Componentes: materia prima, auxiliares, energía, salario, otros, indirectos → **costo unitario** (calculado en servidor).
- Si materia prima se omite, el backend usa `avg_cost` de almacén o `cost_std`.
- Precio **sugerido** = unitario × 1.30 (solo orientativo).
- Escribe `product.cost_std`.
- Solo escribe `price_sale` si **no** hay ficha de precio y el producto aún no tiene precio.

## Ficha de precio

- Fuente de verdad del **precio de lista / POS**.
- `cost_ref` vacío → servidor resuelve: avg_cost → ficha de costo → cost_std → última recepción.
- Margen vacío y sin precio → **25 %** por defecto en servidor.
- `price` vacío → `cost_ref × (1 + margen/100)`.
- Precio &lt; costo de referencia **exige** `notes` con el motivo.
- Una ficha vigente por producto (el servidor retira las anteriores).
- Siempre actualiza `product.price_sale`.

## POS

Sin `price_sale` ni `unit_price` en la línea → el backend rechaza la venta (400).

## Flujo operativo

```
Entrada almacén (avg_cost)
  → Ficha de costo (opcional, análisis)
  → Ficha de precio (obligatoria para vender)
  → POS usa price_sale
```
