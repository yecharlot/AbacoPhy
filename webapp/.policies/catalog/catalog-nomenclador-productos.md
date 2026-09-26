# Política de cliente — Nomenclador de productos

**Feature:** `catalog`  
**Vista / nav id:** `catalog`  
**Fecha:** 2026-09-26  
**Estado:** vigente

## Nombre

- **Navegación:** «Nomenclador»
- **Pantalla / título:** «Nomenclador de productos»

## Responsabilidad exclusiva

El **nomenclador de productos** es el **único** lugar del sistema donde se **definen** y **modifican** productos.

Define únicamente atributos de **identidad y clasificación**:

| Campo | Obligatorio | Notas |
|-------|-------------|--------|
| Código | No | Autogenerado por backend si se omite; el usuario puede imponerlo |
| Nombre | Sí | Denominación del producto |
| Unidad de medida | Sí (default `ud`) | Del nomenclador de UM o texto libre controlado |
| Categoría | No | Clasificación operativa |

## Fuera de alcance (no económicos)

El nomenclador **no** gestiona valores económicos:

- ❌ Costo unitario / costo estándar
- ❌ Precio de venta
- ❌ Márgenes, listas de precios, monedas de tarifa

Esos datos pertenecen a otras features cuando existan (fichas de costo, fichas de precio, recepción con costo de entrada, POS, etc.).

## Relación con el resto del software

1. **Recepción, transferencias, almacén, POS, facturación:** solo **seleccionan** productos ya definidos en el nomenclador.
2. **No** se crean productos “al vuelo” desde recepción ni desde otras pantallas operativas.
3. Si no hay productos, el flujo operativo debe orientar al usuario al **Nomenclador**, no ofrecer alta improvisada.

## Implicaciones técnicas (FE)

- Formulario y listado del nomenclador: sin campos ni columnas de costo/precio.
- `CreateProductInput` / `UpdateProductInput`: sin `costStd` / `priceSale`.
- Mapper de escritura: no envía `cost_std` / `price_sale` desde esta feature.
- Lectura: si el API aún devuelve costos/precios, pueden mapearse en entidad por compatibilidad, pero **no** se editan ni se muestran en el nomenclador.

## Fuente de verdad

La definición de producto (código, nombre, UM, categoría) tiene como fuente de verdad el **nomenclador**. Cualquier alta o cambio de definición pasa por esta feature.
