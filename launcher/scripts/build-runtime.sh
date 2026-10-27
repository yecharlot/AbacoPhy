#!/usr/bin/env bash
# F2: compila abacophy y copia estáticos web a launcher/runtime/
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LAUNCHER_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
# monorepo root = parent of launcher/
REPO_ROOT="$(cd "$LAUNCHER_ROOT/.." && pwd)"

OUT_BIN="$LAUNCHER_ROOT/runtime/bin"
OUT_STATIC="$LAUNCHER_ROOT/runtime/static"

TARGET_OS=""
TARGET_ARCH="${GOARCH:-amd64}"
BUILD_WEB=0
SKIP_GO=0

usage() {
  cat <<USAGE
Uso: $(basename "$0") [opciones]

  --linux          Cross-compile Linux amd64
  --windows        Cross-compile Windows amd64 (.exe)
  --darwin         Cross-compile macOS amd64
  --arch ARCH      GOARCH (default: amd64)
  --web            Intenta npm run build en webapp y usa web/dist si existe
  --skip-go        Solo copia estáticos
  -h, --help       Esta ayuda

Salida:
  launcher/runtime/bin/abacophy[.exe]
  launcher/runtime/static/   (desde static/ del repo, o web/dist con --web)
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --linux)   TARGET_OS=linux; shift ;;
    --windows) TARGET_OS=windows; shift ;;
    --darwin)  TARGET_OS=darwin; shift ;;
    --arch)    TARGET_ARCH="$2"; shift 2 ;;
    --web)     BUILD_WEB=1; shift ;;
    --skip-go) SKIP_GO=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Opción desconocida: $1"; usage; exit 1 ;;
  esac
done

mkdir -p "$OUT_BIN" "$OUT_STATIC"

# --- Go binary ---
if [[ "$SKIP_GO" -eq 0 ]]; then
  if ! command -v go >/dev/null 2>&1; then
    echo "ERROR: 'go' no está en PATH. Instala Go o usa --skip-go." >&2
    exit 1
  fi

  if [[ -z "$TARGET_OS" ]]; then
    case "$(uname -s)" in
      Linux*)  TARGET_OS=linux ;;
      Darwin*) TARGET_OS=darwin ;;
      MINGW*|MSYS*|CYGWIN*) TARGET_OS=windows ;;
      *) TARGET_OS=linux ;;
    esac
  fi

  EXT=""
  if [[ "$TARGET_OS" == "windows" ]]; then
    EXT=".exe"
  fi
  OUT_FILE="$OUT_BIN/abacophy${EXT}"

  echo "==> Compilando abacophy ($TARGET_OS/$TARGET_ARCH) → $OUT_FILE"
  (
    cd "$REPO_ROOT"
    CGO_ENABLED=0 GOOS="$TARGET_OS" GOARCH="$TARGET_ARCH" \
      go build -ldflags="-s -w" -o "$OUT_FILE" ./cmd/abacophy
  )
  chmod +x "$OUT_FILE" 2>/dev/null || true
  ls -lh "$OUT_FILE"
else
  echo "==> Skip Go (--skip-go)"
fi

# --- Static assets ---
# Preferencia: static/ del monorepo (servido por Go en producción Docker).
# Opcional: web/dist tras build de webapp.
STATIC_SRC="$REPO_ROOT/static"

if [[ "$BUILD_WEB" -eq 1 ]]; then
  if [[ -d "$REPO_ROOT/webapp" ]] && command -v npm >/dev/null 2>&1; then
    echo "==> Building webapp (npm run build)"
    (cd "$REPO_ROOT/webapp" && npm run build)
  else
    echo "WARN: --web pedido pero no hay webapp/npm; se usa static/ del repo"
  fi
  if [[ -d "$REPO_ROOT/web/dist" ]] && [[ -f "$REPO_ROOT/web/dist/index.html" ]]; then
    STATIC_SRC="$REPO_ROOT/web/dist"
    echo "==> Usando web/dist como estáticos"
  fi
fi

if [[ ! -d "$STATIC_SRC" ]]; then
  echo "ERROR: no existe fuente de estáticos: $STATIC_SRC" >&2
  exit 1
fi

echo "==> Copiando estáticos: $STATIC_SRC → $OUT_STATIC"
# Limpia contenido previo salvo README
find "$OUT_STATIC" -mindepth 1 ! -name 'README.md' -exec rm -rf {} + 2>/dev/null || true
# rsync if available, else cp
if command -v rsync >/dev/null 2>&1; then
  rsync -a --delete --exclude 'README.md' "$STATIC_SRC"/ "$OUT_STATIC"/
else
  cp -a "$STATIC_SRC"/. "$OUT_STATIC"/
fi

echo "==> Runtime listo:"
echo "    bin:    $OUT_BIN"
ls -lh "$OUT_BIN" 2>/dev/null || true
echo "    static: $OUT_STATIC ($(find "$OUT_STATIC" -type f | wc -l) archivos)"
echo ""
echo "Prueba manual:"
echo "  PORT=18090 ABACOPHY_STATIC=\"$OUT_STATIC\" ABACOPHY_DATA=\"/tmp/abacophy-demo-data\" \\"
echo "    \"$OUT_BIN/abacophy\" &"
echo "  curl -s -o /dev/null -w '%{http_code}\\n' http://127.0.0.1:18090/api/v1/health"
echo "  # abrir http://127.0.0.1:18090/"
