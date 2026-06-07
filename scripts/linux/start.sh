#!/usr/bin/env bash
# start.sh -- Start / Stop Task Manager server (Linux / macOS)
#
# Usage:
#   ./start.sh [--build]          # Foreground (Ctrl+C to stop)
#   ./start.sh start [--build]    # Background
#   ./start.sh stop               # Stop background server
#   ./start.sh restart [--build]  # Restart background server
#   ./start.sh status             # Check server status
#
#   --build  Run npm run build before starting

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
PID_FILE="$ROOT_DIR/server.pid"
LOG_FILE="$ROOT_DIR/server.log"
PYTHON=$(command -v python3 || command -v python)

# Parse --build flag (can appear anywhere)
BUILD=0
ARGS=()
for arg in "$@"; do
  if [ "$arg" = "--build" ]; then BUILD=1; else ARGS+=("$arg"); fi
done

if [ -z "$PYTHON" ]; then
  echo "[ERROR] Python not found, run ./setup.sh first"
  exit 1
fi

_build_frontend() {
  if ! command -v npm &>/dev/null; then
    echo "[ERROR] npm not found, cannot build frontend (install Node.js first)"
    exit 1
  fi
  if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
    echo "[INFO] node_modules not found, running npm install first..."
    npm --prefix "$FRONTEND_DIR" install --silent
  fi
  echo "[BUILD] Building frontend..."
  npm --prefix "$FRONTEND_DIR" run build
  echo "[OK] Frontend build complete"
  echo ""
}

_start_fg() {
  echo "=== Task Manager ==="
  echo "Foreground | http://localhost:8080 | Ctrl+C to stop"
  echo ""
  cd "$BACKEND_DIR"
  exec "$PYTHON" server.py
}

_start_bg() {
  if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
    echo "[WARN] Server already running in background (PID $(cat "$PID_FILE"))"
    echo "       Run ./start.sh stop first, or ./start.sh restart to restart"
    exit 1
  fi
  cd "$BACKEND_DIR"
  nohup "$PYTHON" server.py >> "$LOG_FILE" 2>&1 &
  echo $! > "$PID_FILE"
  sleep 1
  if kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
    echo "[OK] Server started in background (PID $(cat "$PID_FILE"))"
    echo "     URL : http://localhost:8080"
    echo "     Log : $LOG_FILE"
    echo "     Stop: ./start.sh stop"
  else
    echo "[ERROR] Server failed to start, check log: $LOG_FILE"
    rm -f "$PID_FILE"
    exit 1
  fi
}

_stop() {
  if [ ! -f "$PID_FILE" ]; then
    echo "[WARN] PID file not found, server may not be running in background"
    exit 0
  fi
  PID=$(cat "$PID_FILE")
  if kill -0 "$PID" 2>/dev/null; then
    kill "$PID"
    rm -f "$PID_FILE"
    echo "[OK] Server stopped (PID $PID)"
  else
    echo "[WARN] PID $PID no longer exists, removing PID file"
    rm -f "$PID_FILE"
  fi
}

_status() {
  if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
    echo "[OK] Running (PID $(cat "$PID_FILE")) | http://localhost:8080"
  else
    echo "[--] Not running"
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
    echo "Usage: $0 [start|stop|restart|status] [--build]"
    exit 1
    ;;
esac
