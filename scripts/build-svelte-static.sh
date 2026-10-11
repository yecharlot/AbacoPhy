#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/webapp"
npm ci
npm run build
DIST="$ROOT/web/dist"
STATIC="$ROOT/static"
cp -f "$DIST/index.html" "$STATIC/index.html"
rm -rf "$STATIC/assets"
cp -a "$DIST/assets" "$STATIC/assets"
cp -f "$DIST/index.html" "$STATIC/app/index.html"
mkdir -p "$STATIC/app/assets"
cp -a "$DIST/assets/." "$STATIC/app/assets/"
echo "Svelte UI → static/ (listo para Go o para commit antes de Render sin Docker multi-stage)"
