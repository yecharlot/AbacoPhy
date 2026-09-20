# Despliegue y multiplataforma — ÁbacoPhy

ÁbacoPhy es un **motor Go + PWA offline-first**. Eso permite:

- Servidor en la nube (Render, Cloudflare, VPS)
- Ejecutable local (Linux / Windows) sin servidor externo
- PWA instalable en móvil
- Shell Electron para escritorio

## 1. Contraseñas por defecto

Documentadas en **LOGIN.md** (no se muestran en la UI):

| Usuario | Clave inicial |
|---------|----------------|
| `master` | `AbacoPhy#Master1` |
| `admin` | `admin123` |

**Dónde cambiarlas en la app**

1. Inicia sesión.
2. Menú lateral → **Negocio**.
3. Bloque **Seguridad · cambiar contraseña**.
4. Admin/master puede indicar otro usuario del negocio para restablecer su clave.

API: `POST /api/v1/auth/password`  
Body: `{ "current_password": "...", "new_password": "...", "username": "opcional" }`

Tras un reinicio de fábrica (master), vuelven las claves de LOGIN.md.

## 2. Local (Linux / Debian / GNOME) — ya lo usas

```bash
go run ./cmd/prisma-tec   # o
go run ./cmd/abacophy
# Abre http://localhost:8080 (o el PORT definido)
```

Datos en `ABACOPHY_DATA` o `./abacophy_data`.

## 3. Escritorio con Electron (Ubuntu 20.04)

Guía completa: **desktop/README.md**

Resumen:

```bash
./scripts/build-desktop.sh
cd desktop
npm install
npm start                 # prueba
npm run pack:linux       # AppImage + .deb
npm run pack:win         # instalador / portable Windows
```

El instalador lleva el binario Go; los datos del cliente quedan en el perfil de usuario del SO (offline total).

## 4. Windows sin Electron (Win 7+)

1. Genera `desktop/bin/abacophy.exe` con el script anterior.
2. En el PC del cliente: ejecuta `abacophy.exe`.
3. Abre el navegador en `http://127.0.0.1:8080`.

No depende de Electron ni de versiones modernas de Windows.

## 5. Android

| Opción | Offline | Esfuerzo |
|--------|---------|----------|
| PWA “Añadir a inicio” | Parcial (SW + cola) | Ya listo |
| TWA / Capacitor apuntando al servidor | Depende de red + SW | Bajo |
| Motor Go en el dispositivo | Total | Alto (gomobile) |

Recomendación comercial hoy: **PWA + servidor Cloudflare/VPS** y, si el cliente no tiene red estable, **entregar el .exe / binario Linux** para PC.

## 6. Alternativa a Render: Cloudflare

Render cobra por instancia siempre encendida. Cloudflare encaja mejor con coste bajo:

### A) Worker + Durable Object (API en el edge)

Carpeta `cloudflare/` del repo. Flujo:

1. Cuenta Cloudflare (ya tienes account id).
2. `npm i -g wrangler` y `wrangler login` (o token API).
3. Configurar `cloudflare/wrangler.toml` con tu account_id.
4. `wrangler deploy`

El DO guarda el snapshot del tenant; la UI puede servirse desde **Cloudflare Pages** (carpeta `static/app`) apuntando la API al Worker.

### B) Solo Pages + binario local del cliente

- Pages sirve la PWA estática.
- Cada PyME ejecuta el motor Go en su PC (máxima soberanía, cero factura de servidor de app).

### C) VPS barato (Hetzner, Oracle free tier, etc.)

Un único `abacophy` en systemd + dominio en Cloudflare (proxy naranja, SSL gratis). Más predecible que free tier de Render.

## 7. Matriz recomendada

| Escenario | Qué entregar |
|-----------|----------------|
| Demo / SaaS central | Cloudflare Worker+DO o VPS + dominio propio |
| Cliente sin internet fiable | `abacophy` / `abacophy.exe` o instalador Electron |
| Móvil del gestor | PWA instalada |
| Varios negocios (multi-tenant) | Un servidor central + tenants; o un binario por negocio |

## 8. Checklist salida a un cliente nuevo

1. Cambiar claves master/admin (Negocio → Seguridad).
2. Personalizar nombre y moneda del negocio.
3. Elegir canal: nube **o** instalable offline.
4. Probar login, un ingreso, una factura PDF y una salva.
5. Entregar LOGIN.md solo al administrador técnico (no al mostrador).
