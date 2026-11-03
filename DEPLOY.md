# Despliegue y multiplataforma — ÁbacoPhy

ÁbacoPhy es un **motor Go + PWA offline-first**. Eso permite:

- Servidor en la nube (Render, Cloudflare, VPS)
- Ejecutable local (Linux / Windows) sin servidor externo
- PWA instalable en móvil
- Shell Electron para escritorio

## 1. Credenciales iniciales

No existen contraseñas bootstrap predeterminadas ni reutilizables. En el primer arranque, AbacoPhy genera credenciales aleatorias y las guarda temporalmente en `bootstrap-credentials.txt`, dentro de `ABACOPHY_DATA`. El primer acceso obliga a cambiar la contraseña. El archivo temporal se elimina cuando todas las cuentas iniciales han completado el cambio.

No publiques, copies a logs ni compartas ese archivo. Restringe el acceso al directorio de datos y conserva una copia protegida antes de actualizar instalaciones existentes.

API para cambio de contraseña: `POST /api/v1/auth/password`  
Body: `{ "current_password": "...", "new_password": "...", "username": "opcional" }`

## 2. Modos de exposición de red (A2)

El backend usa `ABACOPHY_BIND_MODE` para decidir explícitamente dónde escucha:

| Modo | Valor | Host predeterminado | Comportamiento |
|---|---|---|---|
| Local | `LOCAL` (predeterminado) | `127.0.0.1` | Solo conexiones del propio equipo; mDNS desactivado |
| Red local | `LAN` | `0.0.0.0` | Acceso por interfaces de red y anuncio mDNS |
| Producción | `PRODUCTION` | Sin valor predeterminado | Requiere `ABACOPHY_HOST` explícito; configurar reverse proxy/firewall |

Variables:
- `ABACOPHY_BIND_MODE`: `LOCAL`, `LAN` o `PRODUCTION`.
- `ABACOPHY_HOST`: IP de escucha. En `LOCAL` solo acepta loopback; en `LAN` acepta una IP de interfaz o wildcard; en `PRODUCTION` es obligatoria y puede ser loopback detrás de un proxy local o wildcard explícito dentro de un contenedor protegido por su plataforma.
- `ABACOPHY_PORT`: puerto explícito; si no está definido, se conserva compatibilidad con `PORT`; predeterminado `8090`.

Ejemplos PowerShell:

```powershell
# Solo este equipo (seguro por defecto)
$env:ABACOPHY_BIND_MODE = "LOCAL"
Remove-Item Env:ABACOPHY_HOST -ErrorAction SilentlyContinue
.abacophy.exe

# Compartir en la red local (decisión explícita)
$env:ABACOPHY_BIND_MODE = "LAN"
$env:ABACOPHY_HOST = "0.0.0.0"
.abacophy.exe

# Producción detrás de reverse proxy en el mismo host
$env:ABACOPHY_BIND_MODE = "PRODUCTION"
$env:ABACOPHY_HOST = "127.0.0.1"
$env:ABACOPHY_PORT = "8090"
.abacophy.exe
```

En producción, el proxy debe terminar TLS/HTTPS y el firewall debe limitar el acceso al backend. El modo `PRODUCTION` no instala ni configura TLS por sí mismo. No publicar el puerto del backend directamente a Internet.

El Launcher hereda las variables de entorno del proceso que lo inicia. Para habilitar acceso LAN desde el Launcher, establece `ABACOPHY_BIND_MODE=LAN` antes de abrirlo. En modo `LOCAL`, las direcciones LAN y mDNS no estarán disponibles.

## 3. Local (Linux / Debian / GNOME)

```bash
go run ./cmd/abacophy
# Abre http://127.0.0.1:8090
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
