# Delicias en Ruta — UI estática modular (AbacoPhy)

Rama: `feature/delicias-en-ruta`

## Qué es

Versión estática modular de la experiencia AbacoPhy **orientada solo a Delicias en Ruta Pp**:

- Menú lateral por módulos (como el shell Svelte)
- Paleta y logo del branding Delicias en Ruta
- Clean architecture en JS del navegador:
  - `js/domain` — entidades y puerto de repositorio
  - `js/application` — casos de uso
  - `js/infrastructure` — persistencia IPFS (o content-addressing local)
  - `js/ui` — shell + vistas

**No sustituye** el `webapp/` Svelte ni el backend Go de `main`. Convive en `static/delicias-en-ruta/`.

## Abrir

Servir la carpeta con cualquier HTTP estático, por ejemplo:

```bash
cd static/delicias-en-ruta
python3 -m http.server 8765
```

Abrir http://127.0.0.1:8765/

## Persistencia IPFS

- Por defecto: hash SHA-256 + `localStorage` con el mismo contrato de CID.
- Opcional: `window.__IPFS_API__ = 'http://127.0.0.1:5001'` antes de cargar para usar API Kubo `/api/v0/add`.

## Módulos del menú

Resumen, POS, Pedidos, Ingresos, Gastos, Reportes, Carta, Almacén, Equipo, Negocio, Traza IPFS.
