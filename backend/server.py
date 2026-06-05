#!/usr/bin/env python3
import http.server, json, threading, queue, io, base64, shutil
from pathlib import Path
from datetime import date, timedelta
from ppt_generator import generate_weekly_ppt, extract_template_colors

HOST = "0.0.0.0"
PORT = 8080
PROJECT_ROOT = Path(__file__).parent.parent   # taskManager_git/
SERVE_DIR = PROJECT_ROOT / 'frontend'          # serve HTML/CSS/JS from here
DATA_DIR = PROJECT_ROOT / 'data'
AVATARS_DIR = PROJECT_ROOT / 'avatars'
WEEKLY_DATA_DIR = PROJECT_ROOT / 'weekly_data'
PPT_TEMPLATE_FILE = DATA_DIR / 'ppt_template.pptx'
DATA_DIR.mkdir(exist_ok=True)
TASKS_FILE = DATA_DIR / 'tasks.json'
USERS_FILE = DATA_DIR / 'users.json'
CHAT_FILE = DATA_DIR / 'chat.json'
POINTS_FILE = DATA_DIR / 'points.json'
LEAVES_FILE = DATA_DIR / 'leaves.json'
PERSONAL_TASKS_FILE = DATA_DIR / 'personal_tasks.json'
WEEKLY_CONFIG_FILE = DATA_DIR / 'weekly_config.json'
_tasks_lock = threading.Lock()
_weekly_lock = threading.Lock()
_users_lock = threading.Lock()
_chat_lock = threading.Lock()
_points_lock = threading.Lock()
_leaves_lock = threading.Lock()
_personal_tasks_lock = threading.Lock()

def get_week_folder():
    today = date.today()
    iso = today.isocalendar()
    return f"{iso[0]}-W{iso[1]:02d}"

def load_weekly_config():
    if WEEKLY_CONFIG_FILE.exists():
        try:
            return json.loads(WEEKLY_CONFIG_FILE.read_text(encoding='utf-8'))
        except:
            pass
    return {"title": "", "presenters": ""}

def save_weekly_config(data):
    with _weekly_lock:
        WEEKLY_CONFIG_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')

def load_weekly_records(week=None):
    if week is None:
        week = get_week_folder()
    week_dir = WEEKLY_DATA_DIR / week
    if not week_dir.exists():
        return []
    records = []
    for task_dir in sorted(week_dir.iterdir()):
        if not task_dir.is_dir():
            continue
        record_file = task_dir / 'record.json'
        if record_file.exists():
            try:
                rec = json.loads(record_file.read_text(encoding='utf-8'))
                for img in rec.get('images', []):
                    img['url'] = f'/weekly_data/{week}/{task_dir.name}/{img["filename"]}'
                    img['path'] = str(task_dir / img['filename'])
                records.append(rec)
            except:
                pass
    return records

def save_weekly_record(payload):
    week = get_week_folder()
    task_id = payload.get('taskId', 0)
    task_dir = WEEKLY_DATA_DIR / week / f'task-{task_id}'
    task_dir.mkdir(parents=True, exist_ok=True)

    images_meta = []
    for img in payload.get('images', []):
        fname = img.get('filename', 'img.png')
        data_b64 = img.get('data', '')
        if data_b64:
            (task_dir / fname).write_bytes(base64.b64decode(data_b64))
        images_meta.append({'filename': fname, 'caption': img.get('caption', '')})

    record = {
        'taskId': task_id,
        'taskText': payload.get('taskText', ''),
        'project': payload.get('project', ''),
        'notes': payload.get('notes', ''),
        'images': images_meta,
        'handlers': payload.get('handlers', []),
        'week': week,
        'savedAt': date.today().isoformat()
    }
    with _weekly_lock:
        (task_dir / 'record.json').write_text(json.dumps(record, ensure_ascii=False, indent=2), encoding='utf-8')
    return record


def load_leaves():
    if LEAVES_FILE.exists():
        try:
            leaves = json.loads(LEAVES_FILE.read_text(encoding='utf-8'))
            today = date.today().isoformat()
            # 保留今天及未來的假期
            return [l for l in leaves if (l.get('endDate') or l.get('date', '')) >= today]
        except:
            pass
    return []

def save_leaves(leaves):
    with _leaves_lock:
        LEAVES_FILE.write_text(json.dumps(leaves, ensure_ascii=False, indent=2), encoding='utf-8')

def load_personal_tasks():
    if PERSONAL_TASKS_FILE.exists():
        try:
            return json.loads(PERSONAL_TASKS_FILE.read_text(encoding='utf-8'))
        except:
            pass
    return {}

def save_personal_tasks(data):
    with _personal_tasks_lock:
        PERSONAL_TASKS_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')

def get_week_key():
    """Return ISO week key, e.g. '2026-W16'"""
    today = date.today()
    iso = today.isocalendar()
    return f"{iso[0]}-W{iso[1]:02d}"

def load_points():
    if POINTS_FILE.exists():
        try:
            return json.loads(POINTS_FILE.read_text(encoding='utf-8'))
        except:
            pass
    return {"rockets": {}, "votes": {}}

def save_points(data):
    with _points_lock:
        POINTS_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')

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

        elif self.path == '/api/leaves':
            leaves = load_leaves()
            body = json.dumps(leaves, ensure_ascii=False).encode('utf-8')
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", len(body))
            self.end_headers()
            self.wfile.write(body)

        elif self.path.startswith('/api/personal-tasks'):
            from urllib.parse import urlparse, parse_qs
            qs = parse_qs(urlparse(self.path).query)
            name = qs.get('name', [''])[0]
            if not name:
                self.send_error(400, 'Missing name'); return
            data = load_personal_tasks()
            tasks_for_user = data.get(name, [])
            body = json.dumps({'tasks': tasks_for_user}, ensure_ascii=False).encode('utf-8')
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", len(body))
            self.end_headers()
            self.wfile.write(body)

        elif self.path == '/api/points':
            data = load_points()
            # 附加本週 key 給前端判斷
            data['week'] = get_week_key()
            body = json.dumps(data, ensure_ascii=False).encode('utf-8')
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

        elif self.path == '/api/ppt-template-info':
            info = {'exists': PPT_TEMPLATE_FILE.exists()}
            body = json.dumps(info).encode()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', len(body))
            self.end_headers()
            self.wfile.write(body)

        elif self.path == '/api/weekly-config':
            body = json.dumps(load_weekly_config(), ensure_ascii=False).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', len(body))
            self.end_headers()
            self.wfile.write(body)

        elif self.path == '/api/weekly-records':
            week = get_week_folder()
            records = load_weekly_records(week)
            body = json.dumps({'week': week, 'records': records}, ensure_ascii=False).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', len(body))
            self.end_headers()
            self.wfile.write(body)

        elif self.path.startswith('/api/weekly-record'):
            from urllib.parse import urlparse, parse_qs
            qs = parse_qs(urlparse(self.path).query)
            task_id = qs.get('taskId', [''])[0]
            if not task_id:
                self.send_error(400, 'Missing taskId'); return
            week = get_week_folder()
            task_dir = WEEKLY_DATA_DIR / week / f'task-{task_id}'
            record_file = task_dir / 'record.json'
            if record_file.exists():
                try:
                    rec = json.loads(record_file.read_text(encoding='utf-8'))
                    for img in rec.get('images', []):
                        img['url'] = f'/weekly_data/{week}/task-{task_id}/{img["filename"]}'
                    body = json.dumps(rec, ensure_ascii=False).encode('utf-8')
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json; charset=utf-8')
                    self.send_header('Content-Length', len(body))
                    self.end_headers()
                    self.wfile.write(body)
                except:
                    self.send_error(500)
            else:
                self.send_error(404)

        elif self.path.startswith('/weekly_data/'):
            rel = self.path[len('/weekly_data/'):]
            if '..' in rel:
                self.send_error(403); return
            filepath = WEEKLY_DATA_DIR / rel
            if filepath.exists() and filepath.is_file():
                data = filepath.read_bytes()
                ext = filepath.suffix.lower()
                ct = {'.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp'}.get(ext, 'application/octet-stream')
                self.send_response(200)
                self.send_header('Content-Type', ct)
                self.send_header('Content-Length', len(data))
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

        elif self.path in ('/', '/index.html') or self.path.lstrip('/').isdigit():
            data = (SERVE_DIR / 'index.html').read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", len(data))
            self.end_headers()
            self.wfile.write(data)

        elif self.path.endswith('.css') or self.path.endswith('.js'):
            filename = self.path.lstrip('/')
            filepath = SERVE_DIR / filename
            if filepath.exists() and filepath.is_file():
                ext = filepath.suffix
                ct = {'.css': 'text/css', '.js': 'application/javascript'}.get(ext, 'text/plain')
                data = filepath.read_bytes()
                self.send_response(200)
                self.send_header('Content-Type', ct)
                self.send_header('Content-Length', len(data))
                self.end_headers()
                self.wfile.write(data)
            else:
                self.send_error(404)

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

        elif self.path == '/api/leaves':
            length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(length)
            try:
                req = json.loads(body)
                action = req.get('action')  # 'add' or 'remove'
                name   = req.get('name')
                today  = date.today().isoformat()
                leaves = load_leaves()

                if action == 'add':
                    leave_date = req.get('date', '')
                    end_date   = req.get('endDate', '') or leave_date
                    if not leave_date or leave_date < today:
                        self.send_error(400, 'Invalid date')
                        return
                    if end_date < leave_date:
                        end_date = leave_date
                    # 同一人同一起始日只保留一筆
                    leaves = [l for l in leaves if not (l['name'] == name and l['date'] == leave_date)]
                    leaves.append({
                        'name': name,
                        'avatar': req.get('avatar', ''),
                        'avatar_type': req.get('avatar_type', 'emoji'),
                        'date': leave_date,
                        'endDate': end_date,
                        'note': req.get('note', '')
                    })
                    leaves.sort(key=lambda l: l['date'])
                    save_leaves(leaves)
                    _broadcast(json.dumps({
                        'type': 'leave_update',
                        'action': 'add',
                        'leave': leaves[-1] if leaves else {},
                        'leaves': leaves
                    }, ensure_ascii=False))

                elif action == 'remove':
                    leave_date = req.get('date', '')
                    leaves = [l for l in leaves if not (l['name'] == name and l['date'] == leave_date)]
                    save_leaves(leaves)
                    _broadcast(json.dumps({
                        'type': 'leave_update',
                        'action': 'remove',
                        'leaves': leaves
                    }, ensure_ascii=False))

                resp = json.dumps({'ok': True, 'leaves': leaves}).encode()
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Content-Length', len(resp))
                self.end_headers()
                self.wfile.write(resp)
            except Exception as e:
                self.send_error(400, str(e))

        elif self.path == '/api/points/vote':
            length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(length)
            try:
                req = json.loads(body)
                voter = req.get('voter')       # 投票者名稱
                voted_for = req.get('votedFor') # 被投票者名稱
                task_id = req.get('taskId')
                task_text = req.get('taskText', '')

                if not voter or not voted_for:
                    self.send_error(400, 'Missing voter or votedFor')
                    return

                week = get_week_key()
                data = load_points()
                if 'rockets' not in data: data['rockets'] = {}
                if 'votes' not in data: data['votes'] = {}
                if week not in data['votes']: data['votes'][week] = {}

                # 檢查本週是否已投票
                if voter in data['votes'][week]:
                    resp = json.dumps({"ok": False, "error": "already_voted"}).encode()
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json')
                    self.send_header('Content-Length', len(resp))
                    self.end_headers()
                    self.wfile.write(resp)
                    return

                # 記錄投票並增加火箭
                data['votes'][week][voter] = {'votedFor': voted_for, 'taskId': task_id, 'taskText': task_text}
                data['rockets'][voted_for] = data['rockets'].get(voted_for, 0) + 1
                save_points(data)

                # SSE 廣播積分更新
                _broadcast(json.dumps({
                    "type": "points_update",
                    "rockets": data['rockets'],
                    "voter": voter,
                    "votedFor": voted_for,
                    "taskText": task_text,
                    "week": week
                }, ensure_ascii=False))

                resp = json.dumps({"ok": True, "rockets": data['rockets']}).encode()
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
                history_dir = PROJECT_ROOT / 'history'
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
        elif self.path == '/api/personal-tasks':
            length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(length)
            try:
                req = json.loads(body)
                name = req.get('name', '')
                if not name:
                    self.send_error(400, 'Missing name'); return
                data = load_personal_tasks()
                data[name] = req.get('tasks', [])
                save_personal_tasks(data)
                resp = b'{"ok":true}'
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Content-Length', len(resp))
                self.end_headers()
                self.wfile.write(resp)
            except Exception as e:
                self.send_error(400, str(e))

        elif self.path == '/api/upload-ppt-template':
            try:
                content_type = self.headers.get('Content-Type', '')
                length = int(self.headers.get('Content-Length', 0))
                body = self.rfile.read(length)
                if 'multipart/form-data' not in content_type:
                    self.send_error(400, 'Expected multipart/form-data'); return
                boundary = content_type.split('boundary=')[1].encode()
                for part in body.split(b'--' + boundary):
                    if b'filename=' in part and (b'.pptx' in part.lower() or b'.ppt' in part.lower()):
                        header_end = part.find(b'\r\n\r\n')
                        if header_end != -1:
                            file_data = part[header_end + 4:].rstrip(b'\r\n--')
                            PPT_TEMPLATE_FILE.write_bytes(file_data)
                            break
                resp = json.dumps({'ok': True}).encode()
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Content-Length', len(resp))
                self.end_headers()
                self.wfile.write(resp)
            except Exception as e:
                self.send_error(400, str(e))

        elif self.path == '/api/weekly-config':
            length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(length)
            try:
                data = json.loads(body)
                save_weekly_config({'title': data.get('title', ''), 'presenters': data.get('presenters', '')})
                resp = b'{"ok":true}'
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Content-Length', len(resp))
                self.end_headers()
                self.wfile.write(resp)
            except Exception as e:
                self.send_error(400, str(e))

        elif self.path == '/api/weekly-record':
            length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(length)
            try:
                payload = json.loads(body)
                record = save_weekly_record(payload)
                resp = json.dumps({'ok': True, 'record': record}).encode()
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Content-Length', len(resp))
                self.end_headers()
                self.wfile.write(resp)
            except Exception as e:
                self.send_error(400, str(e))

        elif self.path == '/api/generate-ppt':
            length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(length)
            try:
                config = json.loads(body)
                records = load_weekly_records()
                pptx_bytes = generate_weekly_ppt(config, records, PPT_TEMPLATE_FILE)
                week_num = get_week_folder().split('W')[1]
                month_day = date.today().strftime('%m%d')
                filename = f'sync week{week_num}_{month_day}.pptx'
                self.send_response(200)
                self.send_header('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation')
                self.send_header('Content-Disposition', f'attachment; filename="{filename}"')
                self.send_header('Content-Length', len(pptx_bytes))
                self.end_headers()
                self.wfile.write(pptx_bytes)
            except Exception as e:
                err = str(e).encode()
                self.send_response(500)
                self.send_header('Content-Type', 'text/plain')
                self.send_header('Content-Length', len(err))
                self.end_headers()
                self.wfile.write(err)

        elif self.path == '/api/clear-weekly-history':
            try:
                current_week = get_week_folder()
                removed = 0
                if WEEKLY_DATA_DIR.exists():
                    for d in WEEKLY_DATA_DIR.iterdir():
                        if d.is_dir() and d.name != current_week:
                            shutil.rmtree(d)
                            removed += 1
                resp = json.dumps({'ok': True, 'removed': removed}).encode()
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Content-Length', len(resp))
                self.end_headers()
                self.wfile.write(resp)
            except Exception as e:
                self.send_error(500, str(e))

        else:
            self.send_error(404)

    def log_message(self, fmt, *args):
        print(f"[{self.address_string()}] {fmt % args}")

if __name__ == '__main__':
    server = http.server.ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"✅ http://{HOST}:{PORT}/")
    server.serve_forever()
