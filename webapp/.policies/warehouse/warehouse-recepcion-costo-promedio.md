# Política de cliente — Recepción vs. entrada física y costo promedio ponderado

**Feature:** warehouse (Informes de recepción + Almacén)  
**Relacionada:** catalog (Nomenclador de productos)  
**Fecha:** 2026-09-27  
**Estado:** vigente

## Principio

Un **Informe de recepción** representa una declaración de una compra/mercancía esperada o recibida documentalmente, pero **no constituye por sí mismo una entrada física al inventario**.

La creación del informe **no debe modificar el stock físico ni el costo promedio ponderado**. El informe queda pendiente para que el **almacenero** compruebe físicamente la mercancía y decida si corresponde dar entrada.

Esto separa dos responsabilidades:

1. **Económico / comprador:** declara la compra mediante el Informe de recepción y proporciona producto, cantidad y costo unitario documental.
2. **Almacenero:** verifica la mercancía realmente recibida y ejecuta la entrada física. Solo esa acción actualiza stock y costo promedio ponderado.

Esta separación evita que diferencias por faltantes, robo, deterioro, daño, sustituciones u otras incidencias conviertan automáticamente una compra documentada en existencias físicas que no existen.

## Efecto de cada operación

| Operación | Stock físico | Costo promedio ponderado | Estado de recepción |
|---|---:|---:|---|
| Crear Informe de recepción | **No** | **No** | Pendiente |
| Dar entrada desde Almacén | **Sí** | **Sí** | Entrada confirmada |
| Marcar problema desde Almacén | **No** | **No** | Problemas con la entrada |

El **costo unitario informado en la recepción es un dato documental de esa compra** hasta que el almacenero confirme la entrada.

## Estados operativos

El estado operativo se conserva en **metadata** de la recepción, dentro de `int`, para que las pantallas de Económico/Comprador y Almacén compartan una misma señal:

- `int.reception_status = "pending_entry"` → **anaranjado**: pendiente de dar entrada.
- `int.reception_status = "entry_confirmed"` → **verde**: entrada física confirmada.
- `int.reception_status = "entry_problem"` → **rojo**: existe un problema que impide confirmar la entrada.

Cuando el estado sea `entry_problem`, debe existir:

- `int.reception_problem_reason` → motivo explicado por el almacenero.
- `int.reception_entry_actor` → usuario que registró la decisión.
- `int.reception_entry_at` → fecha/hora de la decisión.

El campo `status` existente se mantiene sincronizado por compatibilidad de API, pero **metadata es la fuente del estado visual y de la incidencia**.

## Flujo

### 1. Informe de recepción

El económico/comprador registra producto del nomenclador, cantidad documental, costo unitario documental, proveedor/factura/documento y observaciones.

Al crear el informe:

- se genera el documento;
- queda disponible para Almacén;
- **no se suma cantidad a WarehouseStock;**
- **no se recalcula AvgCost;**
- no se ejecuta ninguna operación de entrada física.

### 2. Almacén

Almacén muestra las recepciones pendientes y permite:

- **Dar entrada** cuando la mercancía coincide con el informe;
- **Reportar problema** cuando la mercancía no coincide o existe una incidencia.

Al dar entrada, el backend calcula:

```text
nuevo_promedio =
  (stock_actual × promedio_actual + qty_recibida × costo_unitario)
  / (stock_actual + qty_recibida)
```

y actualiza stock y costo promedio.

Si existe un problema, **no se modifica stock ni costo promedio**. Se registra el motivo en metadata y el estado pasa a `entry_problem`.

## Comunicación entre pantallas

### Informes de recepción — scope económico/comprador

Debe permitir crear informes, consultar su estado, distinguir visualmente pendientes/confirmados/problemáticos y mostrar un cuadro específico **Entradas con problemas** con el motivo comunicado por Almacén.

No debe ofrecer el botón **Dar entrada**.

### Almacén — scope almacenero

Debe permitir consultar recepciones pendientes, abrir el detalle, dar entrada física, reportar problemas con motivo y consultar las incidencias.

## Fuente de verdad

- **Producto / datos maestros:** Nomenclador.
- **Compra declarada:** Informe de recepción.
- **Estado del proceso de recepción:** metadata `int.reception_*`.
- **Stock físico:** Almacén / WarehouseStock.
- **Costo promedio ponderado:** resultado de la entrada física confirmada en Almacén.
- **Responsable de actualizar stock y promedio:** backend, a partir de la acción de entrada del almacenero.