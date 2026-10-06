# Política — Fichas de costo (productos base vs compuestos)

**Feature:** costing + warehouse + catalog  
**Fecha:** 2026-10-06  
**Estado:** vigente  
**Relacionada:** `warehouse-recepcion-costo-promedio.md`, `catalog-nomenclador-productos.md`, `fichas-costo-precio.md`

## Principio general

Los **productos base** obtienen su costo a partir de la **adquisición** y la **recepción confirmada** en almacén.  
Los **productos compuestos** obtienen su costo a partir de su **ficha de costo (receta)**, usando los costos actuales de sus componentes más el costo de tiempo y dificultad de elaboración.

```
Entrada declarada (Informe de recepción)
        ≠
Entrada física confirmada (almacenero)
        →
Costo de adquisición (avg_cost del producto base)
        →
Ficha de costo (receta del compuesto)
        →
Costo calculado (resultado dinámico)
        →
Ficha de precio (precio de venta / price_sale)
```

## 1. Productos base

Un **producto base** no se elabora en el negocio: se adquiere externamente.

| Paso | Efecto en stock | Efecto en avg_cost |
|------|-----------------|-------------------|
| Crear Informe de recepción | No | No |
| Confirmar entrada (almacenero) | Sí | Sí (promedio ponderado) |

El **costo promedio unitario** del producto base es el valor de entrada principal para las fichas de los compuestos que lo usan.

**No** se define el costo de un producto base mediante ficha de elaboración.

## 2. Productos compuestos

Un **producto compuesto** se elabora internamente con uno o más productos del inventario (base o compuesto).

La **Ficha de Costo** es la **receta de producción**. Debe registrar al menos:

- Producto elaborado (output)
- Componentes (productos/materiales) y cantidad o fracción por unidad de output
- Tiempo de elaboración (p. ej. minutos)
- Nivel de dificultad (escala parametrizable) y **factor** de dificultad (multiplicador)
- Costo de mano de obra / tiempo
- Costo material, costo total unitario
- Relación compuesto ↔ componentes

### Ejemplo

Base A y base B con `avg_cost` tras entrada confirmada.  
Compuesto C: ½ A + ⅓ B + 30 min + factor dificultad 1.1

```
CostoMaterialesC = (1/2 × AvgCostA) + (1/3 × AvgCostB)
CostoTiempoC     = CostoBaseTiempo × (30/60) × FactorDificultad
                   (o × minutos, según convención del tenant; ver §3)
CostoC           = CostoMaterialesC + CostoTiempoC
```

## 3. Factor de dificultad

- La **escala de dificultad** (p. ej. 1–5) es una etiqueta de UX/configuración.
- El **factor de dificultad** es el multiplicador numérico usado en la fórmula.
- No deben confundirse: el nivel puede mapearse a un factor (tabla configurable por tenant).
- La implementación no asume que la escala 1–5 sea inmutable.

```
CostoManoObra = CostoBaseTiempo × Tiempo × FactorDificultad
```

`CostoBaseTiempo` y el mapeo nivel→factor son parametrizables (tenant / metadata).

## 4. Compuestos dentro de compuestos

Un compuesto puede ser componente de otro compuesto (p. ej. C dentro de D).

```
CostoComponenteC = qty × CostoUnitarioC
```

El costo de D suma todos los componentes (base o compuesto) + elaboración de D.

Estructura recursiva permitida:

```
base → compuesto → compuesto → …
```

**Prohibido:** ciclos (A → B → C → A). El sistema debe rechazar dependencias circulares.

## 5. Propagación de cambios de costo

La ficha (receta) es estable; el **costo calculado** es dinámico.

Si cambia el `avg_cost` de un base A (nueva entrada confirmada):

1. Actualizar A  
2. Recalcular fichas que usan A (directa o indirectamente) en orden topológico  
3. Propagar a compuestos dependientes (C → D → …)

Igual si cambia el costo calculado de un compuesto usado como componente.

## 6. Separación receta vs costo calculado

| Elemento | Qué es | Qué cambia con un avg_cost nuevo |
|----------|--------|----------------------------------|
| Ficha / receta | Componentes, qty, tiempo, dificultad | **No** |
| Costo calculado | Resultado numérico unitario | **Sí** |

## 7. Relación con ficha de precio

- Ficha de costo → costo de elaboración / `cost_std` del compuesto.  
- Ficha de precio → precio de venta (`price_sale`) con margen sobre costo de referencia.  
- Un cambio de costo puede sugerir revisar el precio; **no** redefine solo el precio de lista salvo política explícita de margen fijo.

## 8. Roles

| Actor | Responsabilidad |
|-------|-----------------|
| Económico / comprador | Informe de recepción (documental) |
| Almacenero | Confirmar entrada → avg_cost base |
| Económico / contador | Definir y mantener fichas de costo (recetas) |
| Económico / admin | Fichas de precio |
| Vendedor | Consume `price_sale` en POS |

## 9. Implicaciones de implementación

- Dominio: componentes en la ficha; detección de ciclos; recálculo y grafo de dependencias.
- Persistencia: receta + último costo calculado; sin exigir migración destructiva de campos legacy.
- UI: editor de receta (líneas de componente + tiempo + dificultad); mostrar costo material / mano de obra / total.
- Al confirmar recepción: disparar propagación de costos hacia compuestos dependientes.

## 10. Edición y eliminación de fichas de costo

- **Editar:** se puede modificar la receta (añadir/quitar componentes, cantidades, tiempo, dificultad) y volver a guardar. El product_id de la ficha no cambia.
- **Eliminar:** permitido solo si el producto de la ficha **no** aparece como componente en ninguna otra ficha de costo.
- Si otras recetas dependen de él, el sistema responde **409** y exige quitar primero ese componente de esas composiciones.

## 11. Producto base vs compuesto en la UI

- **Base:** producto **sin** ficha de costo (o sin componentes). Aparece en el selector de *Nueva ficha*.
- **Compuesto:** producto **con** ficha de costo que incluye al menos un componente con cantidad > 0.
- Crear ficha nueva solo sobre un base; al guardar con componentes, pasa a compuesto.
- Si ya tiene ficha, **no** aparece en el selector de alta: solo **Editar** / **Eliminar** en el listado.
