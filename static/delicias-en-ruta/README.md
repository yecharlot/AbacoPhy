# Delicias en Ruta · UI ÁbacoPhy

Diseño propio de **Delicias en Ruta** + **gemelo funcional** de la rama `main` de ÁbacoPhy.

## Arranque

```bash
# En la raíz del repo (rama feature/delicias-en-ruta-safe)
DELICIAS_HOME=1 go run ./cmd/abacophy
# → http://localhost:8090/delicias-en-ruta/
# con DELICIAS_HOME=1 la raíz / redirige a Delicias
```

- **Online:** si `/api/v1/health` responde, usa la API real (cuentas, asientos, POS, almacén, etc.).
- **Offline:** persiste en almacenamiento local / IPFS mock.

Login (API): `admin` / `admin123` o master según `LOGIN.md`.

## Windows portable

Ver `dist/delicias-windows/` o `scripts/build-delicias-windows.sh`.
