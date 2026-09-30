# Transferencia desde listado de stock (Almacén)

## Principio
La vista Almacén es un **punto de acceso** a la misma funcionalidad de
`CreateTransfer` / `store.addTransfer` que usa Transferencias.
No hay una segunda lógica de transferencia.

## Efectos (invariantes)
- Baja stock almacén, sube stock del PDV.
- No es venta ni compra.
- No altera la ecuación contable (sigue siendo inventario).
- Destino: solo unidades de venta (`state.units`) del negocio.
- Traza: la del endpoint existente de transferencias.

## UX
- Por fila: **Transferir** → modal (cantidad + PDV).
  - Confirmar → `addTransfer` inmediato (1 producto).
  - Pre-transferencia → carrito local (no API).
  - Cancelar → cierra modal.
- Con carrito: **Realizar transferencia** → resumen → N llamadas
  `addTransfer` agrupadas por `unitId`.
