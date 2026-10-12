#!/usr/bin/env bash
# Portable Windows: Delicias en Ruta + API ÁbacoPhy (sin Go/npm en el PC destino)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
OUT="$ROOT/dist/delicias-windows"
rm -rf "$OUT"
mkdir -p "$OUT/static/delicias-en-ruta"

export CGO_ENABLED=0 GOOS=windows GOARCH=amd64
go build -trimpath -ldflags="-s -w" -o "$OUT/DeliciasEnRuta.exe" ./cmd/abacophy

# static required by server + Delicias UI
cp -a static/delicias-en-ruta/. "$OUT/static/delicias-en-ruta/"
# minimal fallbacks for icons if present
for f in favicon.svg abacus_color_icon.svg; do
  [ -f "static/$f" ] && cp "static/$f" "$OUT/static/" || true
done
mkdir -p "$OUT/static/app"
# empty placeholders so server does not crash on missing paths
[ -f static/app/sw.js ] && cp static/app/sw.js "$OUT/static/app/" || echo '// delicias' > "$OUT/static/app/sw.js"
[ -f static/app/manifest.webmanifest ] && cp static/app/manifest.webmanifest "$OUT/static/app/" || echo '{}' > "$OUT/static/app/manifest.webmanifest"
[ -f static/app/icon.svg ] && cp static/app/icon.svg "$OUT/static/app/" || echo '<svg xmlns="http://www.w3.org/2000/svg"/>' > "$OUT/static/app/icon.svg"
[ -f static/app/index.html ] && cp static/app/index.html "$OUT/static/app/" || printf '%s\n' '<!doctype html><meta http-equiv="refresh" content="0;url=/delicias-en-ruta/">' > "$OUT/static/app/index.html"

cat > "$OUT/Iniciar-Delicias-en-Ruta.bat" << 'BAT'
@echo off
cd /d "%~dp0"
set PORT=8090
set DELICIAS_HOME=1
set ABACOPHY_STATIC=static
set ABACOPHY_DATA=abacophy_data
echo Delicias en Ruta - AbacoPhy
echo http://127.0.0.1:8090/delicias-en-ruta/
start "" http://127.0.0.1:8090/delicias-en-ruta/
DeliciasEnRuta.exe
pause
BAT

cat > "$OUT/README.txt" << 'TXT'
Delicias en Ruta — portable Windows 10/11
=========================================
No requiere Go ni npm.

1. Doble clic en Iniciar-Delicias-en-Ruta.bat
2. Navegador: http://127.0.0.1:8090/delicias-en-ruta/
3. Login API (si aplica): admin / admin123

Datos en carpeta abacophy_data\
UI Delicias en static\delicias-en-ruta\
TXT

echo "OK $OUT"
ls -la "$OUT"
