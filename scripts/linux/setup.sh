#!/usr/bin/env bash
# setup.sh — 安裝 Task Manager 所需套件（Linux / macOS）

set -e

echo "=== Task Manager Setup ==="

PYTHON=$(command -v python3 || command -v python)
if [ -z "$PYTHON" ]; then
  echo "❌ 找不到 Python，請先安裝 Python 3.10+"
  exit 1
fi

MAJOR=$("$PYTHON" -c "import sys; print(sys.version_info.major)")
MINOR=$("$PYTHON" -c "import sys; print(sys.version_info.minor)")
VERSION="$MAJOR.$MINOR"
echo "✔ Python $VERSION"

if [ "$MAJOR" -lt 3 ] || { [ "$MAJOR" -eq 3 ] && [ "$MINOR" -lt 10 ]; }; then
  echo "❌ 需要 Python 3.10 以上，目前為 $VERSION"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REQ="$SCRIPT_DIR/../../backend/requirements.txt"

echo "安裝套件（fastapi, uvicorn, python-pptx）..."
"$PYTHON" -m pip install -r "$REQ" --quiet

echo ""
echo "✅ 安裝完成！執行 ./start.sh 啟動伺服器。"
