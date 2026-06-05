# Claude Code 設定

## 語言
使用**繁體中文**回應。

---

## 專案概覽

多人協作任務管理系統，含個人便條紙看板與週報 PPT 自動生成。

**技術棧：** Vue 3 + Vite + Pinia 前端 + FastAPI + uvicorn 後端 + SSE 即時同步 + JSON 檔案儲存

**安裝：**
```bash
pip install -r backend/requirements.txt   # Python 後端
cd frontend && npm install                # 前端開發工具
```

**啟動（生產）：**
```bash
cd frontend && npm run build   # 產出 dist/
python3 backend/server.py      # FastAPI serve dist/ at :8080
```

**啟動（開發，HMR）：**
```bash
python3 backend/server.py      # port 8080（API）
cd frontend && npm run dev     # port 5173（Vite HMR）
```
→ `http://localhost:8080`（生產） / `http://localhost:5173`（開發）
→ Swagger UI：`http://localhost:8080/docs`

---

## 專案結構

```
taskManager_git/
├── frontend/               ← Vue 3 + Vite 專案
│   ├── index.html          # Vite entry（掛載 #app）
│   ├── style.css           # 全域 CSS（import in main.js）
│   ├── package.json / vite.config.js
│   └── src/
│       ├── main.js         # createApp + createPinia → mount('#app')
│       ├── App.vue         # 根元件：layout + init all stores
│       ├── api.js          # HTTP layer（所有 fetch 呼叫）
│       ├── composables/useAvatar.js  # avHTML, esc, COLORS, isOverdue
│       ├── stores/         # Pinia stores
│       │   ├── user.js     # profile, myIP, teamName, setupVisible
│       │   ├── tasks.js    # tasks[], computed sugTasks/doneTasks, CRUD
│       │   ├── notes.js    # notes[], typePickerOpen, editModalOpen
│       │   ├── chat.js     # messages[]
│       │   ├── leaves.js   # leaves[]
│       │   ├── points.js   # rockets, votes, leaderboard
│       │   ├── sse.js      # EventSource → dispatch to stores
│       │   └── weekly.js   # confirmOpen, recordOpen, pptOpen, wrImages
│       └── components/     # Vue SFC
│           ├── AppHeader.vue / SetupScreen.vue / HelpModal.vue / MobTabs.vue
│           ├── SugPanel.vue / NotesBoard.vue / NoteModal.vue
│           ├── ChatPanel.vue / TaskDrawer.vue / TaskModal.vue
│           └── LeaveModal / VoteModal / WeeklyConfirm / WeeklyRecord / PPTModal / Notification
├── backend/
│   ├── server.py           # FastAPI app、lifespan、所有 API 路由
│   ├── ppt_generator.py    # 週報 PPT 生成邏輯（不動）
│   └── requirements.txt    # fastapi, uvicorn[standard], python-multipart, python-pptx
└── data/                   # runtime 資料（gitignored，自動建立）
    ├── tasks.json / users.json / chat.json
    ├── leaves.json / points.json / notes.json
    ├── weekly_config.json
    └── ppt_template.pptx
```

**其他 runtime 目錄（gitignored）：** `avatars/` / `history/` / `weekly_data/`

---

## 架構關鍵

**Vue 前端架構：**
- `main.js` → `createApp(App).use(createPinia()).mount('#app')`
- `App.vue` 的 `onMounted`：`userStore.init()` → 並行 load 所有資料 → `sseStore.connect()`
- `sseStore`：`EventSource('/api/events')` 接收事件 → dispatch 給對應 store（tasks/chat/user/leaves/points）
- 響應式：store 狀態變更 → Vue 自動重繪，不需手動呼叫 `render()`
- `vite.config.js`：dev 模式 proxy `/api`、`/avatars`、`/weekly_data` → FastAPI port 8080

**路徑常數（backend/server.py）：**
- `PROJECT_ROOT` = taskManager_git/（backend/ 的上層）
- `SERVE_DIR` = `PROJECT_ROOT / 'frontend'`（SPA fallback catch-all route）
- `DATA_DIR` = `PROJECT_ROOT / 'data'`
- 靜態資源：`/avatars` / `/weekly_data` 由 `StaticFiles` mount 服務

**FastAPI 架構重點：**
- `lifespan` context manager 取代棄用的 `on_event`
- SSE 用 `asyncio.Queue` + `StreamingResponse`，`_broadcast()` 為 async
- 檔案 I/O 仍用 `threading.Lock`（JSON 讀寫為同步操作）
- 檔案上傳用 `UploadFile`（需 `python-multipart`）
- SPA deep-link：catch-all `GET /{full_path:path}` 回傳 `index.html`

**儲存：** `save()` 防抖 100ms → POST `/api/tasks` → SSE 廣播 → 所有人同步

**渲染：** `render()` 是主渲染入口，重繪建議面板 + 已完成；四象限元素有 null guard（已移除）

**Drawer：** `openDrawer(id)` 開側欄，`openTaskId` 記錄當前開啟的 task id；含編輯、複製連結、刪除任務按鈕（第二行）

**便條紙：** `_notes[]` per-user，`loadNotes()` / `renderNotes()` / `toggleNoteItem(noteId, idx)` 直接切換 checkbox；`openNoteTypePicker()` → 選類型 → `_openNoteModal()`

**使用手冊：** `toggleHelp()` / `closeHelp(event)` 控制 `#help-overlay` modal

**週報流程：** Task done → 確認視窗 → 填說明 + 圖片 → 存 `weekly_data/` → PPT modal 上傳模板 → 生成週報

---

## Task 物件欄位

```js
{
  id, text, desc, due,
  q,                         // 象限 1-4（供建議面板排序用）
  done, doneAt,
  handlers: [{name, avatar, avatar_type}],
  comments: [{text, ip, time, name, avatar, avatar_type, likes:[{name,ip}]}],
  createdBy: {name, avatar, avatar_type},
  createdAt
}
```

**相容性：** 舊資料有 `handler`（單一），新版用 `handlers`（陣列）。
讀取時：`t.handlers || (t.handler ? [t.handler] : [])`

---

## Note 物件欄位

```js
{
  id,                        // Date.now().toString()
  type,                      // 'text' | 'rich' | 'checklist'
  title,                     // 標題（text 類型不顯示）
  body,                      // 純文字或內文
  items: [{text, done}],     // checklist 項目
  color,                     // 顏色 key（'default'|'red'|'orange'|...）
  createdAt, updatedAt
}
```

---

## 主要 API

| 方法 | 路由 | 說明 |
|------|------|------|
| GET/POST | `/api/tasks` | 團隊任務 |
| GET/POST | `/api/users` | 用戶資料 |
| GET/POST | `/api/chat` | 留言板 |
| GET/POST | `/api/leaves` | 請假 |
| GET/POST | `/api/notes?name=X` | 個人便條紙（不廣播 SSE，上限 30）|
| GET | `/api/events` | SSE 連線 |
| GET | `/api/ip` | 客戶端 IP |
| POST | `/api/upload-avatar` | 上傳頭像 |
| POST | `/api/history` | 操作日誌 |
| GET/POST | `/api/weekly-config` | 週報設定 |
| GET | `/api/weekly-records` | 本週所有任務記錄 |
| GET | `/api/weekly-record?taskId=X` | 單一任務記錄 |
| POST | `/api/weekly-record` | 儲存任務說明 + 圖片 |
| GET | `/api/ppt-template-info` | 模板上傳狀態 |
| POST | `/api/upload-ppt-template` | 上傳 PPT 模板（存於 data/）|
| POST | `/api/generate-ppt` | 生成並下載週報 PPTX |
| POST | `/api/clear-weekly-history` | 清除非本週週報資料 |
