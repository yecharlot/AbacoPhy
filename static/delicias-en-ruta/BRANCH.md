# Delicias en Ruta — rama segura

`feature/delicias-en-ruta-safe` = `main` + UI Delicias (diseño propio) + **gemelo funcional**.

## Probar

```bash
git fetch origin
git checkout -b feature/delicias-en-ruta-safe origin/feature/delicias-en-ruta-safe

DELICIAS_HOME=1 go run ./cmd/abacophy
# http://localhost:8090/delicias-en-ruta/
```

Windows: `dist/delicias-windows/Iniciar-Delicias-en-Ruta.bat` (sin Go/npm).

No merges a `main` hasta validar.


## AOS-ERP (2026-10-17)

Panel **AOS-ERP · Salud** en menú Finanzas:
- Grafo de operaciones (verde=éxito Zyrion 1, rojo=fallo 0, gris=pendiente 2)
- Filtro por categoría y estado
- Clic en nodo → detalle + conexiones
- Cada operación se sella con SHA-256 en cadena local (`localStorage` key `delicias.aos-erp.chain`)
- Si no hay asientos/ventas, muestra demo para el directivo
- Módulo preparado para reutilizar en otros dominios (`domain/aos-erp.js`)
