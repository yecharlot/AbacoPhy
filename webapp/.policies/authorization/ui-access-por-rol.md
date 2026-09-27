# Política FE — Acceso a pantallas por rol (sin tocar backend)

**Scope:** solo frontend  
**Fecha:** 2026-09-27  
**Estado:** vigente

## Principio

El backend (ViewACL) **no se modifica**.  
La UI usa una **política de pantallas** en el cliente como fuente de verdad de lo que se **muestra y se puede abrir** en el menú.

## Defaults por rol (pantallas)

| Rol | Pantallas |
|-----|-----------|
| **vendedor** | Solo **Punto de venta (POS)** |
| **contador** | Resumen, Informes/Reportes, Almacén, Transferencias |
| **almacenero** | Almacén, Nomenclador |
| **economico** | Resumen, Gastos, Ingresos, Informes, Recepción, Fichas de costo, Fichas de precio |
| **admin** | Todas excepto Master |
| **master** | Todas |

## Overrides

1. **Globales por rol** — editables por master/admin en pantalla Permisos (persistencia local del navegador + forma metadata).
2. **Individuales por usuario** — acceso especial fuera de su rol; se guardan como metadata lógica `ui_access` en el almacén FE (por `userId`).

## Forma metadata (lógica)

```json
{
  "ui_access": {
    "mode": "replace",
    "screens": ["pos", "dashboard"]
  }
}
```

- `replace`: solo esas pantallas  
- `extra`: unión con el default del rol  

## Nota seguridad API

El backend puede seguir permitiendo endpoints según ViewACL.  
Esta política **solo controla la UI**. Restricción de API sigue siendo responsabilidad del servidor.
