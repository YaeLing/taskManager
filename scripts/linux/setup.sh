#!/usr/bin/env bash
# setup.sh — 安裝 Task Manager 所需套件（Linux / macOS）

set -e

echo "=== Task Manager Setup ==="

PYTHON=$(command -v python3 || command -v python)
if [ -z "$PYTHON" ]; then
  echo "❌ 找不到 Python，請先安裝 Python 3.8+"
  exit 1
fi

MAJOR=$("$PYTHON" -c "import sys; print(sys.version_info.major)")
MINOR=$("$PYTHON" -c "import sys; print(sys.version_info.minor)")
VERSION="$MAJOR.$MINOR"
echo "✔ Python $VERSION"

if [ "$MAJOR" -lt 3 ] || { [ "$MAJOR" -eq 3 ] && [ "$MINOR" -lt 8 ]; }; then
  echo "❌ 需要 Python 3.8 以上，目前為 $VERSION"
  exit 1
fi

echo "安裝 python-pptx..."
"$PYTHON" -m pip install python-pptx --quiet

echo ""
echo "✅ 安裝完成！執行 ./start.sh 啟動伺服器。"
