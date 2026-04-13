#!/usr/bin/env python3
import http.server, json, threading, queue
from pathlib import Path
from datetime import date

HOST = "0.0.0.0"
PORT = 8080
SERVE_DIR = Path(__file__).parent
TASKS_FILE = SERVE_DIR / 'tasks.json'
USERS_FILE = SERVE_DIR / 'users.json'
CHAT_FILE = SERVE_DIR / 'chat.json'
AVATARS_DIR = SERVE_DIR / 'avatars'
_tasks_lock = threading.Lock()
_users_lock = threading.Lock()
_chat_lock = threading.Lock()

def load_tasks():
    """Load tasks from JSON file"""
    if TASKS_FILE.exists():
        try:
            return json.loads(TASKS_FILE.read_text(encoding='utf-8'))
        except:
            return []
    return []

def save_tasks(tasks):
    """Save tasks to JSON file"""
    with _tasks_lock:
        TASKS_FILE.write_text(json.dumps(tasks, ensure_ascii=False, indent=2), encoding='utf-8')

def load_users():
    """Load users from JSON file"""
    if USERS_FILE.exists():
        try:
            return json.loads(USERS_FILE.read_text(encoding='utf-8'))
        except:
            return {}
    return {}

def save_users(users):
    """Save users to JSON file"""
    with _users_lock:
        USERS_FILE.write_text(json.dumps(users, ensure_ascii=False, indent=2), encoding='utf-8')

def load_chat():
    """Load chat messages from JSON file"""
    if CHAT_FILE.exists():
        try:
            return json.loads(CHAT_FILE.read_text(encoding='utf-8'))
        except:
            return []
    return []

def save_chat(messages):
    """Save chat messages to JSON file"""
    with _chat_lock:
        CHAT_FILE.write_text(json.dumps(messages, ensure_ascii=False, indent=2), encoding='utf-8')

# ── SSE broadcast ──────────────────────────────────────────────
_sse_clients = []
_sse_lock = threading.Lock()

def _broadcast(data: str):
    msg = f"data: {data}\n\n".encode("utf-8")
    with _sse_lock:
        dead = []
        for q in _sse_clients:
            try:
                q.put_nowait(msg)
            except queue.Full:
                dead.append(q)
        for q in dead:
            _sse_clients.remove(q)

# ── HTTP Handler ───────────────────────────────────────────────
class Handler(http.server.BaseHTTPRequestHandler):

    def do_GET(self):
        if self.path == '/api/ip':
            ip = self.client_address[0]
            body = json.dumps({"ip": ip}).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", len(body))
            self.end_headers()
            self.wfile.write(body)

        elif self.path == '/api/tasks':
            # Return all tasks
            tasks = load_tasks()
            body = json.dumps(tasks, ensure_ascii=False).encode('utf-8')
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", len(body))
            self.end_headers()
            self.wfile.write(body)

        elif self.path == '/api/users':
            # Return all users
            users = load_users()
            body = json.dumps(users, ensure_ascii=False).encode('utf-8')
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", len(body))
            self.end_headers()
            self.wfile.write(body)

        elif self.path == '/api/chat':
            # Return all chat messages
            messages = load_chat()
            body = json.dumps(messages, ensure_ascii=False).encode('utf-8')
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", len(body))
            self.end_headers()
            self.wfile.write(body)

        elif self.path.startswith('/avatars/'):
            # Serve avatar images
            filename = self.path[9:]  # Remove '/avatars/'
            # Prevent directory traversal
            if '..' in filename or '/' in filename:
                self.send_error(403)
                return
            filepath = AVATARS_DIR / filename
            if filepath.exists() and filepath.is_file():
                data = filepath.read_bytes()
                # Determine content type
                ext = filepath.suffix.lower()
                content_types = {'.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp'}
                ct = content_types.get(ext, 'application/octet-stream')
                self.send_response(200)
                self.send_header("Content-Type", ct)
                self.send_header("Content-Length", len(data))
                self.send_header("Cache-Control", "public, max-age=86400")
                self.end_headers()
                self.wfile.write(data)
            else:
                self.send_error(404)

        elif self.path == '/api/events':
            self.send_response(200)
            self.send_header("Content-Type", "text/event-stream")
            self.send_header("Cache-Control", "no-cache")
            self.send_header("Connection", "keep-alive")
            self.end_headers()
            q = queue.Queue(maxsize=32)
            with _sse_lock:
                _sse_clients.append(q)
            try:
                self.wfile.write(b": connected\n\n")
                self.wfile.flush()
                while True:
                    try:
                        msg = q.get(timeout=25)
                        self.wfile.write(msg)
                        self.wfile.flush()
                    except queue.Empty:
                        self.wfile.write(b": ping\n\n")
                        self.wfile.flush()
            except (BrokenPipeError, ConnectionResetError, OSError):
                pass
            finally:
                with _sse_lock:
                    if q in _sse_clients:
                        _sse_clients.remove(q)

        elif self.path in ('/', '/index.html'):
            data = (SERVE_DIR / 'index.html').read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", len(data))
            self.end_headers()
            self.wfile.write(data)

        else:
            self.send_error(404)

    def do_POST(self):
        if self.path == '/api/users':
            # Save/update user profile
            length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(length)
            try:
                data = json.loads(body)
                user_id = data.get('id')  # Use IP or custom ID
                if not user_id:
                    user_id = self.client_address[0]
                users = load_users()
                users[user_id] = {
                    'name': data.get('name', ''),
                    'avatar': data.get('avatar', ''),
                    'avatar_type': data.get('avatar_type', 'emoji'),  # 'emoji' or 'custom'
                    'updated': date.today().isoformat()
                }
                save_users(users)
                # Broadcast user update
                _broadcast(json.dumps({
                    "type": "user_update",
                    "user_id": user_id,
                    "user": users[user_id]
                }, ensure_ascii=False))
                resp = json.dumps({"ok": True, "user_id": user_id}).encode()
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Content-Length', len(resp))
                self.end_headers()
                self.wfile.write(resp)
            except Exception as e:
                self.send_error(400, str(e))

        elif self.path == '/api/upload-avatar':
            # Handle avatar image upload
            try:
                content_type = self.headers.get('Content-Type', '')
                if 'multipart/form-data' not in content_type:
                    self.send_error(400, 'Expected multipart/form-data')
                    return

                # Parse boundary
                boundary = content_type.split('boundary=')[1].encode()
                length = int(self.headers.get('Content-Length', 0))
                body = self.rfile.read(length)

                # Simple multipart parser
                parts = body.split(b'--' + boundary)
                file_data = None
                file_ext = 'png'

                for part in parts:
                    if b'filename=' in part:
                        # Extract filename for extension
                        header_end = part.find(b'\r\n\r\n')
                        if header_end != -1:
                            header = part[:header_end].decode('utf-8', errors='ignore')
                            if 'filename="' in header:
                                fn = header.split('filename="')[1].split('"')[0]
                                if '.' in fn:
                                    file_ext = fn.rsplit('.', 1)[1].lower()
                                    if file_ext not in ['png', 'jpg', 'jpeg', 'gif', 'webp']:
                                        file_ext = 'png'
                            file_data = part[header_end + 4:]
                            # Remove trailing boundary markers
                            if file_data.endswith(b'\r\n'):
                                file_data = file_data[:-2]
                            if file_data.endswith(b'--'):
                                file_data = file_data[:-2]
                            if file_data.endswith(b'\r\n'):
                                file_data = file_data[:-2]

                if not file_data:
                    self.send_error(400, 'No file uploaded')
                    return

                # Create avatars directory
                AVATARS_DIR.mkdir(exist_ok=True)

                # Generate unique filename using timestamp and IP
                import hashlib
                ip = self.client_address[0]
                timestamp = str(date.today().isoformat()) + str(id(body))
                filename = hashlib.md5((ip + timestamp).encode()).hexdigest()[:12] + '.' + file_ext

                # Save file
                filepath = AVATARS_DIR / filename
                filepath.write_bytes(file_data)

                avatar_url = f'/avatars/{filename}'
                resp = json.dumps({"ok": True, "url": avatar_url}).encode()
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Content-Length', len(resp))
                self.end_headers()
                self.wfile.write(resp)
            except Exception as e:
                self.send_error(400, str(e))

        elif self.path == '/api/tasks':
            # Save tasks and broadcast update
            length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(length)
            try:
                data = json.loads(body)
                tasks = data.get('tasks', [])
                save_tasks(tasks)
                # Broadcast sync event to all clients
                sync_msg = json.dumps({
                    "type": "sync",
                    "tasks": tasks,
                    "from_ip": self.client_address[0]
                }, ensure_ascii=False)
                _broadcast(sync_msg)
                resp = b'{"ok":true}'
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Content-Length', len(resp))
                self.end_headers()
                self.wfile.write(resp)
            except Exception as e:
                self.send_error(400, str(e))

        elif self.path == '/api/chat':
            # Save chat message and broadcast
            length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(length)
            try:
                data = json.loads(body)
                message = data.get('message')
                if message:
                    messages = load_chat()
                    messages.append(message)
                    # Keep only last 200 messages
                    if len(messages) > 200:
                        messages = messages[-200:]
                    save_chat(messages)
                    # Broadcast chat message to all clients
                    chat_msg = json.dumps({
                        "type": "chat",
                        "message": message,
                        "from_ip": self.client_address[0]
                    }, ensure_ascii=False)
                    _broadcast(chat_msg)
                resp = b'{"ok":true}'
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Content-Length', len(resp))
                self.end_headers()
                self.wfile.write(resp)
            except Exception as e:
                self.send_error(400, str(e))

        elif self.path == '/api/history':
            length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(length)
            try:
                entry = json.loads(body)
                # Write to daily log
                history_dir = SERVE_DIR / 'history'
                history_dir.mkdir(exist_ok=True)
                log_file = history_dir / f'{date.today().isoformat()}.jsonl'
                with open(log_file, 'a', encoding='utf-8') as f:
                    f.write(json.dumps(entry, ensure_ascii=False) + '\n')
                # Broadcast to all SSE clients
                _broadcast(json.dumps(entry, ensure_ascii=False))
                resp = b'{"ok":true}'
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Content-Length', len(resp))
                self.end_headers()
                self.wfile.write(resp)
            except Exception as e:
                self.send_error(400, str(e))
        else:
            self.send_error(404)

    def log_message(self, fmt, *args):
        print(f"[{self.address_string()}] {fmt % args}")

if __name__ == '__main__':
    server = http.server.ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"✅ http://{HOST}:{PORT}/")
    server.serve_forever()
