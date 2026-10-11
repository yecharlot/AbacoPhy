# Probar Delicias en Ruta sin tocar main

Esta UI vive en `static/delicias-en-ruta/` sobre la rama:

**`feature/delicias-en-ruta-safe`** = `main` (9e14dae) + cherry-pick del commit Delicias.

## Cómo probar

```bash
git fetch origin
git checkout feature/delicias-en-ruta-safe
go run ./cmd/abacophy
# abrir http://localhost:8090/delicias-en-ruta/
# o servir solo static según README de la carpeta
```

## Qué NO hacer

- No hagas merge a `main` hasta validar.
- No uses la rama antigua `feature/delicias-en-ruta` (va ~191 commits atrás y provoca conflictos de pull).

## Si tu clone local está “roto”

```bash
git fetch origin
git checkout main
git reset --hard origin/main
git checkout feature/delicias-en-ruta-safe
```
