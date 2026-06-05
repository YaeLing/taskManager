#!/usr/bin/env bash
# setup.sh — 安裝 Task Manager 所需套件（Linux / macOS）
#
# 用法：
#   ./setup.sh        # 一般使用者：僅安裝 Python 後端套件
#   ./setup.sh --dev  # 開發者：另外安裝前端 Node.js 套件（npm install）

set -e

DEV=0
for arg in "$@"; do [ "$arg" = "--dev" ] && DEV=1; done

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
REQ="$ROOT_DIR/backend/requirements.txt"

echo "=== Task Manager Setup ==="

# ── Python ──────────────────────────────────────────────────────
PYTHON=$(command -v python3 || command -v python)
if [ -z "$PYTHON" ]; then
  echo "❌ 找不到 Python，請先安裝 Python 3.10+"
  exit 1
fi

MAJOR=$("$PYTHON" -c "import sys; print(sys.version_info.major)")
MINOR=$("$PYTHON" -c "import sys; print(sys.version_info.minor)")
echo "✔ Python $MAJOR.$MINOR"

if [ "$MAJOR" -lt 3 ] || { [ "$MAJOR" -eq 3 ] && [ "$MINOR" -lt 10 ]; }; then
  echo "❌ 需要 Python 3.10 以上，目前為 $MAJOR.$MINOR"
  exit 1
fi

echo "安裝後端套件（fastapi, uvicorn, python-pptx）..."
"$PYTHON" -m pip install -r "$REQ" --quiet
echo "✔ 後端套件完成"

# ── Node.js（--dev 模式）────────────────────────────────────────
if [ "$DEV" = "1" ]; then
  echo ""
  if ! command -v node &>/dev/null || ! command -v npm &>/dev/null; then
    echo "❌ 找不到 Node.js / npm，請先安裝 Node.js 18+"
    exit 1
  fi
  echo "✔ Node.js $(node --version)  npm $(npm --version)"
  echo "安裝前端套件（vue, vite, pinia）..."
  npm --prefix "$ROOT_DIR/frontend" install --silent
  echo "✔ 前端套件完成"
fi

echo ""
if [ "$DEV" = "1" ]; then
  echo "✅ 安裝完成（開發模式）"
  echo "   執行伺服器：./start.sh"
  echo "   前端開發：  cd frontend && npm run dev"
  echo "   重新 Build：./start.sh --build  或  cd frontend && npm run build"
else
  echo "✅ 安裝完成"
  echo "   執行伺服器：./start.sh"
fi
