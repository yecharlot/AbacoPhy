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
