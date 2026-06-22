#!/usr/bin/env python3
import asyncio, base64, hashlib, json, shutil, threading
from datetime import date, timedelta
from pathlib import Path
from typing import Any

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, UploadFile, File, HTTPException
from fastapi.responses import FileResponse, Response, StreamingResponse
from fastapi.staticfiles import StaticFiles
import uvicorn

from ppt_generator import generate_weekly_ppt, extract_template_colors

# ── Paths ──────────────────────────────────────────────────────
PROJECT_ROOT    = Path(__file__).parent.parent
DIST_DIR        = PROJECT_ROOT / 'dist'
SERVE_DIR       = DIST_DIR if DIST_DIR.exists() else PROJECT_ROOT / 'frontend'
DATA_DIR        = PROJECT_ROOT / 'data'
AVATARS_DIR     = PROJECT_ROOT / 'avatars'
WEEKLY_DATA_DIR = PROJECT_ROOT / 'weekly_data'
PPT_TEMPLATE_FILE = DATA_DIR / 'ppt_template.pptx'

DATA_DIR.mkdir(exist_ok=True)
AVATARS_DIR.mkdir(exist_ok=True)
WEEKLY_DATA_DIR.mkdir(exist_ok=True)

TASKS_FILE         = DATA_DIR / 'tasks.json'
USERS_FILE         = DATA_DIR / 'users.json'
CHAT_FILE          = DATA_DIR / 'chat.json'
POINTS_FILE        = DATA_DIR / 'points.json'
LEAVES_FILE        = DATA_DIR / 'leaves.json'
PERSONAL_TASKS_FILE= DATA_DIR / 'personal_tasks.json'
WEEKLY_CONFIG_FILE = DATA_DIR / 'weekly_config.json'
NOTES_FILE         = DATA_DIR / 'notes.json'

# ── File locks ─────────────────────────────────────────────────
_locks: dict[str, threading.Lock] = {k: threading.Lock() for k in
    ['tasks','users','chat','points','leaves','personal_tasks','weekly','notes']}

# ── Generic JSON helpers ────────────────────────────────────────
def _read(path: Path, default):
    if path.exists():
        try:
            return json.loads(path.read_text(encoding='utf-8'))
        except Exception:
            pass
    return default

def _write(lock_key: str, path: Path, data):
    with _locks[lock_key]:
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')

# ── Domain helpers ──────────────────────────────────────────────
def get_week_key() -> str:
    iso = date.today().isocalendar()
    return f"{iso[0]}-W{iso[1]:02d}"

def load_tasks():       return _read(TASKS_FILE, [])
def save_tasks(d):      _write('tasks', TASKS_FILE, d)
def load_users():       return _read(USERS_FILE, {})
def save_users(d):      _write('users', USERS_FILE, d)
def load_chat():        return _read(CHAT_FILE, [])
def save_chat(d):       _write('chat', CHAT_FILE, d)
def load_points():      return _read(POINTS_FILE, {"rockets": {}, "votes": {}})
def save_points(d):     _write('points', POINTS_FILE, d)
def load_notes():       return _read(NOTES_FILE, {})
def save_notes(d):      _write('notes', NOTES_FILE, d)
def load_personal():    return _read(PERSONAL_TASKS_FILE, {})
def save_personal(d):   _write('personal_tasks', PERSONAL_TASKS_FILE, d)
def load_wconfig():     return _read(WEEKLY_CONFIG_FILE, {"title": "", "presenters": ""})
def save_wconfig(d):    _write('weekly', WEEKLY_CONFIG_FILE, d)

def load_leaves():
    if LEAVES_FILE.exists():
        try:
            today = date.today().isoformat()
            leaves = json.loads(LEAVES_FILE.read_text(encoding='utf-8'))
            return [l for l in leaves if (l.get('endDate') or l.get('date', '')) >= today]
        except Exception:
            pass
    return []

def save_leaves(d): _write('leaves', LEAVES_FILE, d)

def load_weekly_records(week: str | None = None):
    if week is None:
        week = get_week_key()
    week_dir = WEEKLY_DATA_DIR / week
    if not week_dir.exists():
        return []
    records = []
    for task_dir in sorted(week_dir.iterdir()):
        if not task_dir.is_dir():
            continue
        rf = task_dir / 'record.json'
        if rf.exists():
            try:
                rec = json.loads(rf.read_text(encoding='utf-8'))
                rec['week'] = week  # authoritative from folder name
                for img in rec.get('images', []):
                    img['url'] = f'/weekly_data/{week}/{task_dir.name}/{img["filename"]}'
                    img['path'] = str(task_dir / img['filename'])
                records.append(rec)
            except Exception:
                pass
    return records

def load_all_weekly_records():
    """Every record across all week folders (sorted oldest → newest week)."""
    if not WEEKLY_DATA_DIR.exists():
        return []
    records = []
    for week_dir in sorted(WEEKLY_DATA_DIR.iterdir()):
        if week_dir.is_dir():
            records.extend(load_weekly_records(week_dir.name))
    return records

def save_weekly_record(payload: dict):
    week = get_week_key()
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
    with _locks['weekly']:
        (task_dir / 'record.json').write_text(
            json.dumps(record, ensure_ascii=False, indent=2), encoding='utf-8')
    return record

# ── SSE broadcast ───────────────────────────────────────────────
_sse_queues: list[asyncio.Queue] = []
_sse_lock = threading.Lock()

async def _broadcast(data: str):
    msg = f"data: {data}\n\n"
    with _sse_lock:
        dead = []
        for q in _sse_queues:
            try:
                q.put_nowait(msg)
            except asyncio.QueueFull:
                dead.append(q)
        for q in dead:
            _sse_queues.remove(q)

# ── History purge ───────────────────────────────────────────────
def purge_old_history(days: int = 30):
    history_dir = PROJECT_ROOT / 'history'
    if not history_dir.exists():
        return
    cutoff = date.today() - timedelta(days=days)
    removed = sum(
        1 for f in history_dir.glob('*.jsonl')
        if _try_delete_if_old(f, cutoff)
    )
    if removed:
        print(f"🗑️  purged {removed} history file(s) older than {days} days")

def _try_delete_if_old(f: Path, cutoff: date) -> bool:
    try:
        if date.fromisoformat(f.stem) < cutoff:
            f.unlink()
            return True
    except ValueError:
        pass
    return False

async def _daily_purge():
    import datetime
    while True:
        now = datetime.datetime.now()
        next_run = now.replace(hour=12, minute=0, second=0, microsecond=0)
        if next_run <= now:
            next_run += datetime.timedelta(days=1)
        await asyncio.sleep((next_run - now).total_seconds())
        purge_old_history(30)

# ── App ─────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    purge_old_history(30)
    asyncio.create_task(_daily_purge())
    yield

app = FastAPI(lifespan=lifespan)

# ── API routes ──────────────────────────────────────────────────

@app.get("/api/ip")
async def get_ip(request: Request):
    return {"ip": request.client.host}

@app.get("/api/tasks")
async def get_tasks():
    return load_tasks()

@app.post("/api/tasks")
async def post_tasks(request: Request, body: dict[str, Any]):
    tasks = body.get('tasks', [])
    save_tasks(tasks)
    await _broadcast(json.dumps({
        "type": "sync", "tasks": tasks, "from_ip": request.client.host
    }, ensure_ascii=False))
    return {"ok": True}

@app.get("/api/users")
async def get_users():
    return load_users()

@app.post("/api/users")
async def post_users(request: Request, body: dict[str, Any]):
    user_id = body.get('id') or request.client.host
    users = load_users()
    users[user_id] = {
        'name': body.get('name', ''),
        'avatar': body.get('avatar', ''),
        'avatar_type': body.get('avatar_type', 'emoji'),
        'updated': date.today().isoformat()
    }
    save_users(users)
    await _broadcast(json.dumps({
        "type": "user_update", "user_id": user_id, "user": users[user_id]
    }, ensure_ascii=False))
    return {"ok": True, "user_id": user_id}

@app.get("/api/chat")
async def get_chat():
    return load_chat()

@app.post("/api/chat")
async def post_chat(request: Request, body: dict[str, Any]):
    message = body.get('message')
    if message:
        messages = load_chat()
        messages.append(message)
        if len(messages) > 200:
            messages = messages[-200:]
        save_chat(messages)
        await _broadcast(json.dumps({
            "type": "chat", "message": message, "from_ip": request.client.host
        }, ensure_ascii=False))
    return {"ok": True}

@app.get("/api/leaves")
async def get_leaves():
    return load_leaves()

@app.post("/api/leaves")
async def post_leaves(body: dict[str, Any]):
    action = body.get('action')
    name   = body.get('name')
    today  = date.today().isoformat()
    leaves = load_leaves()

    if action == 'add':
        leave_date = body.get('date', '')
        end_date   = body.get('endDate', '') or leave_date
        if not leave_date or leave_date < today:
            raise HTTPException(400, 'Invalid date')
        if end_date < leave_date:
            end_date = leave_date
        leaves = [l for l in leaves if not (l['name'] == name and l['date'] == leave_date)]
        leaves.append({
            'name': name, 'avatar': body.get('avatar', ''),
            'avatar_type': body.get('avatar_type', 'emoji'),
            'date': leave_date, 'endDate': end_date, 'note': body.get('note', '')
        })
        leaves.sort(key=lambda l: l['date'])

    elif action == 'remove':
        leave_date = body.get('date', '')
        leaves = [l for l in leaves if not (l['name'] == name and l['date'] == leave_date)]

    save_leaves(leaves)
    await _broadcast(json.dumps({
        'type': 'leave_update', 'action': action, 'leaves': leaves
    }, ensure_ascii=False))
    return {"ok": True, "leaves": leaves}

@app.get("/api/points")
async def get_points():
    data = load_points()
    data['week'] = get_week_key()
    return data

@app.post("/api/points/vote")
async def post_vote(body: dict[str, Any]):
    voter     = body.get('voter')
    voted_for = body.get('votedFor')
    if not voter or not voted_for:
        raise HTTPException(400, 'Missing voter or votedFor')
    week = get_week_key()
    data = load_points()
    data.setdefault('rockets', {})
    data.setdefault('votes', {})
    data['votes'].setdefault(week, {})
    if voter in data['votes'][week]:
        return {"ok": False, "error": "already_voted"}
    data['votes'][week][voter] = {
        'votedFor': voted_for,
        'taskId': body.get('taskId'),
        'taskText': body.get('taskText', '')
    }
    data['rockets'][voted_for] = data['rockets'].get(voted_for, 0) + 1
    save_points(data)
    await _broadcast(json.dumps({
        "type": "points_update", "rockets": data['rockets'],
        "voter": voter, "votedFor": voted_for,
        "taskText": body.get('taskText', ''), "week": week
    }, ensure_ascii=False))
    return {"ok": True, "rockets": data['rockets']}

@app.get("/api/notes")
async def get_notes(name: str = ''):
    return load_notes().get(name, [])

@app.post("/api/notes")
async def post_notes(body: dict[str, Any]):
    name = body.get('name', '')
    if not name:
        raise HTTPException(400, 'Missing name')
    data = load_notes()
    data[name] = body.get('notes', [])[:30]
    save_notes(data)
    return {"ok": True}

@app.get("/api/personal-tasks")
async def get_personal(name: str = ''):
    if not name:
        raise HTTPException(400, 'Missing name')
    return {"tasks": load_personal().get(name, [])}

@app.post("/api/personal-tasks")
async def post_personal(body: dict[str, Any]):
    name = body.get('name', '')
    if not name:
        raise HTTPException(400, 'Missing name')
    data = load_personal()
    data[name] = body.get('tasks', [])
    save_personal(data)
    return {"ok": True}

@app.post("/api/history")
async def post_history(body: dict[str, Any]):
    history_dir = PROJECT_ROOT / 'history'
    history_dir.mkdir(exist_ok=True)
    log_file = history_dir / f'{date.today().isoformat()}.jsonl'
    with open(log_file, 'a', encoding='utf-8') as f:
        f.write(json.dumps(body, ensure_ascii=False) + '\n')
    await _broadcast(json.dumps(body, ensure_ascii=False))
    return {"ok": True}

@app.post("/api/upload-avatar")
async def upload_avatar(request: Request, file: UploadFile = File(...)):
    ext = (file.filename or 'img.png').rsplit('.', 1)[-1].lower()
    if ext not in ('png', 'jpg', 'jpeg', 'gif', 'webp'):
        ext = 'png'
    data = await file.read()
    token = request.client.host + str(len(data))
    filename = hashlib.md5(token.encode()).hexdigest()[:12] + '.' + ext
    (AVATARS_DIR / filename).write_bytes(data)
    return {"ok": True, "url": f'/avatars/{filename}'}

@app.get("/api/ppt-template-info")
async def ppt_template_info():
    return {"exists": PPT_TEMPLATE_FILE.exists()}

@app.post("/api/upload-ppt-template")
async def upload_ppt_template(file: UploadFile = File(...)):
    data = await file.read()
    PPT_TEMPLATE_FILE.write_bytes(data)
    return {"ok": True}

@app.get("/api/weekly-config")
async def get_wconfig():
    return load_wconfig()

@app.post("/api/weekly-config")
async def post_wconfig(body: dict[str, Any]):
    save_wconfig({'title': body.get('title', ''), 'presenters': body.get('presenters', '')})
    return {"ok": True}

@app.get("/api/weekly-records")
async def get_weekly_records():
    week = get_week_key()
    return {"week": week, "records": load_weekly_records(week)}

@app.get("/api/weekly-records-all")
async def get_weekly_records_all():
    records = load_all_weekly_records()
    weeks = sorted({r.get('week', '') for r in records if r.get('week')})
    return {"records": records, "weeks": weeks, "count": len(records)}

@app.get("/api/weekly-record")
async def get_weekly_record(taskId: str = '', week: str = ''):
    if not taskId:
        raise HTTPException(400, 'Missing taskId')
    # Look in the given week, else search all weeks (newest first)
    if week:
        weeks = [week]
    elif WEEKLY_DATA_DIR.exists():
        weeks = [d.name for d in sorted(WEEKLY_DATA_DIR.iterdir(), reverse=True) if d.is_dir()]
    else:
        weeks = []
    for wk in weeks:
        rf = WEEKLY_DATA_DIR / wk / f'task-{taskId}' / 'record.json'
        if rf.exists():
            rec = json.loads(rf.read_text(encoding='utf-8'))
            rec['week'] = wk
            for img in rec.get('images', []):
                img['url'] = f'/weekly_data/{wk}/task-{taskId}/{img["filename"]}'
            return rec
    raise HTTPException(404)

@app.post("/api/weekly-record")
async def post_weekly_record(body: dict[str, Any]):
    record = save_weekly_record(body)
    return {"ok": True, "record": record}

@app.post("/api/generate-ppt")
async def generate_ppt(body: dict[str, Any]):
    records = load_all_weekly_records()
    pptx_bytes = generate_weekly_ppt(body, records, PPT_TEMPLATE_FILE)
    week_num   = get_week_key().split('W')[1]
    month_day  = date.today().strftime('%m%d')
    filename   = f'sync week{week_num}_{month_day}.pptx'
    return Response(
        content=pptx_bytes,
        media_type='application/vnd.openxmlformats-officedocument.presentationml.presentation',
        headers={'Content-Disposition': f'attachment; filename="{filename}"'}
    )

@app.post("/api/clear-weekly-history")
async def clear_weekly_history():
    current_week = get_week_key()
    removed = 0
    if WEEKLY_DATA_DIR.exists():
        for d in WEEKLY_DATA_DIR.iterdir():
            if d.is_dir() and d.name != current_week:
                shutil.rmtree(d)
                removed += 1
    return {"ok": True, "removed": removed}

# ── SSE ─────────────────────────────────────────────────────────
@app.get("/api/events")
async def sse_events():
    q: asyncio.Queue = asyncio.Queue(maxsize=32)
    with _sse_lock:
        _sse_queues.append(q)

    async def stream():
        yield ": connected\n\n"
        try:
            while True:
                try:
                    msg = await asyncio.wait_for(q.get(), timeout=25)
                    yield msg
                except asyncio.TimeoutError:
                    yield ": ping\n\n"
        finally:
            with _sse_lock:
                if q in _sse_queues:
                    _sse_queues.remove(q)

    return StreamingResponse(stream(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "Connection": "keep-alive"})

# ── Static files ─────────────────────────────────────────────────
# Serve avatars and weekly_data
app.mount("/avatars",     StaticFiles(directory=str(AVATARS_DIR)),     name="avatars")
app.mount("/weekly_data", StaticFiles(directory=str(WEEKLY_DATA_DIR)), name="weekly_data")

# Serve frontend (SPA fallback: all non-API paths → index.html)
@app.get("/{full_path:path}")
async def serve_frontend(full_path: str):
    # Task deep-link: numeric path → index.html
    if full_path.isdigit() or full_path == '':
        return FileResponse(SERVE_DIR / 'index.html')
    target = SERVE_DIR / full_path
    if target.exists() and target.is_file():
        return FileResponse(target)
    return FileResponse(SERVE_DIR / 'index.html')

# ── Entry point ──────────────────────────────────────────────────
if __name__ == '__main__':
    uvicorn.run("server:app", host="0.0.0.0", port=8080, reload=False)
