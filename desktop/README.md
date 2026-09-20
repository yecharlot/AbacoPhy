# ÁbacoPhy Desktop (Electron)

Empaqueta el motor Go + la PWA en una ventana de escritorio.

## Requisitos (Ubuntu 20.04)

```bash
node -v   # 18+ recomendado (usar nvm si hace falta)
npm -v
```

## 1. Compilar el motor Go

Desde la raíz del repo:

```bash
# Linux
mkdir -p desktop/bin
CGO_ENABLED=0 go build -o desktop/bin/abacophy ./cmd/abacophy

# Windows (desde Linux, cross-compile)
CGO_ENABLED=0 GOOS=windows GOARCH=amd64 go build -o desktop/bin/abacophy.exe ./cmd/abacophy
```

## 2. Instalar Electron

```bash
cd desktop
npm install
```

## 3. Probar en desarrollo

```bash
npm start
```

Abre una ventana que levanta `desktop/bin/abacophy` en el puerto 17890 y carga la UI.

Solo nube (sin binario):

```bash
ABACOPHY_URL=https://tu-dominio.example npm start
```

## 4. Generar instaladores

```bash
# Linux: AppImage + .deb (Debian/Ubuntu/GNOME)
npm run pack:linux

# Windows: instalador NSIS + portable
# En Linux necesita wine para firmar a veces; el portable suele generarse igual.
npm run pack:win
```

Salida en `desktop/dist/`.

## Windows 7

Electron 28 **no** soporta Windows 7. Opciones:

1. **Recomendada:** entregar el **binario Go** `abacophy.exe` + abrir el navegador en `http://127.0.0.1:8080` (Windows 7 + Chrome/Firefox actuales).
2. Usar Electron **22.x** (último con soporte parcial de Win 7/8) cambiando en `package.json` la versión de `electron`.

## Android (APK)

No uses Electron. Opciones reales:

1. **PWA** (ya soportada): en Chrome Android → “Añadir a pantalla de inicio”. Offline vía service worker.
2. **Capacitor** o **TWA** (Trusted Web Activity) empaquetando la misma URL/PWA.
3. Cliente offline completo requiere el motor Go en el dispositivo (avanzado: `gomobile` o sincronizar solo datos en el dispositivo).

Ver `DEPLOY.md` en la raíz del repo.
