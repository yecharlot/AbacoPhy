# Negocio: datos del tenant + puntos de venta

## Alcance
La vista **Negocio** (`tenant`) es responsabilidad de gestión del negocio
(admin / master), no del almacenero ni del vendedor.

## Secciones
1. **Datos del negocio** — resumen por defecto; edición bajo demanda (no formulario siempre abierto).
2. **Puntos de venta** — alta vía `POST /units` (warehouse); listado de activos.

## Cierre de PDV
El API actual solo expone GET/POST de unidades activas (sin baja).
El cierre en UI es **gestión local** (localStorage) hasta soporte backend.
