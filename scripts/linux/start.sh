#!/usr/bin/env bash
# start.sh — 啟動 / 停止 Task Manager 伺服器（Linux / macOS）
#
# 用法：
#   ./start.sh [--build]          # 前景執行（Ctrl+C 停止）
#   ./start.sh start [--build]    # 背景執行
#   ./start.sh stop               # 停止背景執行的伺服器
#   ./start.sh restart [--build]  # 重啟背景伺服器
#   ./start.sh status             # 查看執行狀態
#
#   --build  啟動前先執行 npm run build 更新前端

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
PID_FILE="$ROOT_DIR/server.pid"
LOG_FILE="$ROOT_DIR/server.log"
PYTHON=$(command -v python3 || command -v python)

# Parse --build flag (可出現在任意位置)
BUILD=0
ARGS=()
for arg in "$@"; do
  if [ "$arg" = "--build" ]; then BUILD=1; else ARGS+=("$arg"); fi
done

if [ -z "$PYTHON" ]; then
  echo "❌ 找不到 Python，請先執行 ./setup.sh"
  exit 1
fi

_build_frontend() {
  if ! command -v npm &>/dev/null; then
    echo "❌ 找不到 npm，無法 build 前端（請先安裝 Node.js）"
    exit 1
  fi
  echo "🔨 Building frontend..."
  npm --prefix "$FRONTEND_DIR" run build
  echo "✅ Frontend build 完成"
  echo ""
}

_start_fg() {
  echo "=== Task Manager ==="
  echo "前景模式 | http://localhost:8080 | Ctrl+C 停止"
  echo ""
  cd "$BACKEND_DIR"
  exec "$PYTHON" server.py
}

_start_bg() {
  if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
    echo "⚠️  伺服器已在背景執行（PID $(cat "$PID_FILE")）"
    echo "   執行 ./start.sh stop 先停止，或 ./start.sh restart 重啟"
    exit 1
  fi
  cd "$BACKEND_DIR"
  nohup "$PYTHON" server.py >> "$LOG_FILE" 2>&1 &
  echo $! > "$PID_FILE"
  sleep 1
  if kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
    echo "✅ 伺服器已在背景啟動（PID $(cat "$PID_FILE")）"
    echo "   網址：http://localhost:8080"
    echo "   日誌：$LOG_FILE"
    echo "   停止：./start.sh stop"
  else
    echo "❌ 啟動失敗，查看日誌：$LOG_FILE"
    rm -f "$PID_FILE"
    exit 1
  fi
}

_stop() {
  if [ ! -f "$PID_FILE" ]; then
    echo "⚠️  找不到 PID 檔，伺服器可能未在背景執行"
    exit 0
  fi
  PID=$(cat "$PID_FILE")
  if kill -0 "$PID" 2>/dev/null; then
    kill "$PID"
    rm -f "$PID_FILE"
    echo "✅ 伺服器已停止（PID $PID）"
  else
    echo "⚠️  PID $PID 已不存在，清除 PID 檔"
    rm -f "$PID_FILE"
  fi
}

_status() {
  if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
    echo "✅ 執行中（PID $(cat "$PID_FILE")）| http://localhost:8080"
  else
    echo "⭕ 未執行"
    [ -f "$PID_FILE" ] && rm -f "$PID_FILE"
  fi
}

[ "$BUILD" = "1" ] && _build_frontend

case "${ARGS[0]:-fg}" in
  ""  | fg)   _start_fg   ;;
  start)      _start_bg   ;;
  stop)       _stop       ;;
  restart)    _stop; sleep 1; _start_bg ;;
  status)     _status     ;;
  *)
    echo "用法：$0 [start|stop|restart|status] [--build]"
    exit 1
    ;;
esac
