#!/usr/bin/env bash
# Compila motores Go para Linux y Windows y prepara desktop/bin
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$ROOT/desktop/bin"
echo "==> Linux amd64"
(cd "$ROOT" && CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -o desktop/bin/abacophy ./cmd/abacophy)
echo "==> Windows amd64"
(cd "$ROOT" && CGO_ENABLED=0 GOOS=windows GOARCH=amd64 go build -ldflags="-s -w" -o desktop/bin/abacophy.exe ./cmd/abacophy)
echo "Listo:"
ls -lh "$ROOT/desktop/bin"
echo "Siguiente: cd desktop && npm install && npm start"
