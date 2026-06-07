#!/usr/bin/env bash
# setup.sh -- Install Task Manager dependencies (Linux / macOS)
#
# Usage:
#   ./setup.sh        # Standard: install Python backend packages only
#   ./setup.sh --dev  # Developer: also install frontend Node.js packages (npm install)

set -e

DEV=0
for arg in "$@"; do [ "$arg" = "--dev" ] && DEV=1; done

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
REQ="$ROOT_DIR/backend/requirements.txt"

echo "=== Task Manager Setup ==="

# -- Python ------------------------------------------------------------------
PYTHON=$(command -v python3 || command -v python)
if [ -z "$PYTHON" ]; then
  echo "[ERROR] Python not found, install Python 3.10+ first"
  exit 1
fi

MAJOR=$("$PYTHON" -c "import sys; print(sys.version_info.major)")
MINOR=$("$PYTHON" -c "import sys; print(sys.version_info.minor)")
echo "[OK] Python $MAJOR.$MINOR"

if [ "$MAJOR" -lt 3 ] || { [ "$MAJOR" -eq 3 ] && [ "$MINOR" -lt 10 ]; }; then
  echo "[ERROR] Requires Python 3.10+, found $MAJOR.$MINOR"
  exit 1
fi

echo "Installing backend packages (fastapi, uvicorn, python-pptx)..."
"$PYTHON" -m pip install -r "$REQ" --quiet
echo "[OK] Backend packages installed"

# -- Node.js (--dev mode) ----------------------------------------------------
if [ "$DEV" = "1" ]; then
  echo ""
  if ! command -v node &>/dev/null || ! command -v npm &>/dev/null; then
    echo "[ERROR] Node.js / npm not found, install Node.js 18+ first"
    exit 1
  fi
  echo "[OK] Node.js $(node --version)  npm $(npm --version)"
  echo "Installing frontend packages (vue, vite, pinia)..."
  npm --prefix "$ROOT_DIR/frontend" install --silent
  echo "[OK] Frontend packages installed"
fi

echo ""
if [ "$DEV" = "1" ]; then
  echo "[OK] Setup complete (dev mode)"
  echo "     Start server : ./start.sh"
  echo "     Frontend dev : cd frontend && npm run dev"
  echo "     Rebuild      : ./start.sh --build  or  cd frontend && npm run build"
else
  echo "[OK] Setup complete"
  echo "     Start server : ./start.sh"
fi
