# Entrega 2 — Recepciones

## Flujo
1. Productos en Catálogo (Entrega 1)
2. **Recepción**: proveedor + líneas (producto, qty, costo unit.)
3. Stock en **Almacén** sube (promedio ponderado en backend)

## API
`POST /receptions` → body `lines[{ product_id, qty, unit_cost }]`, `supplier?`, `doc_ref?`, `date?`, `note?`

## Criterio
- [x] Formulario usable con validación
- [x] Listado de recepciones
- [x] Feedback éxito/error
- [x] Tras confirmar, `loadAll` refresca stock

Siguiente: Entrega 3 Transferencias.


## Política de entrada física — actualización 2026-09-27

- [x] Crear recepción sin mover stock ni costo promedio.
- [x] Exponer recepción pendiente a Almacén.
- [x] Dar entrada física únicamente desde Almacén.
- [x] Confirmar estado mediante metadata int.reception_status.
- [x] Registrar problemas con motivo y mostrarlos al económico/comprador.
- [x] Mantener status legacy sincronizado con metadata.
