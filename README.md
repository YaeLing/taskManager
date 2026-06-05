# Task Manager — 多人協作任務管理系統

多人協作任務管理系統，含個人便條紙看板與週報 PPT 自動生成。

---

## 需求 Requirements

| 角色 | 需求 |
|------|------|
| 一般使用者 | Python 3.10+、現代瀏覽器 |
| 開發者 | Python 3.10+、Node.js 18+、現代瀏覽器 |

---

## 快速開始（一般使用者）

> 前端已預先 build 在 `dist/`，**不需要 Node.js**。

### 1. 安裝 Python 套件

```bash
# Linux / macOS
bash scripts/linux/setup.sh

# Windows
scripts\windows\setup.bat
```

### 2. 啟動伺服器

```bash
# Linux / macOS
bash scripts/linux/start.sh          # 前景執行（Ctrl+C 停止）
bash scripts/linux/start.sh start    # 背景執行

# Windows
scripts\windows\start.bat            REM 前景執行
scripts\windows\start.bat start      REM 背景執行
```

開啟瀏覽器訪問 `http://localhost:8080`
局域網內其他裝置：`http://<主機IP>:8080`

---

## 啟動腳本指令一覽

| 指令 | Linux / macOS | Windows |
|------|---------------|---------|
| 前景執行 | `start.sh` | `start.bat` |
| 背景執行 | `start.sh start` | `start.bat start` |
| 停止 | `start.sh stop` | `start.bat stop` |
| 重啟 | `start.sh restart` | `start.bat restart` |
| 查看狀態 | `start.sh status` | `start.bat status` |
| 重新 build 後啟動 | `start.sh start --build` | `start.bat start --build` |

> 背景模式日誌輸出至 `server.log`，PID 記錄於 `server.pid`。
> 預設監聽 `0.0.0.0:8080`，可在 `backend/server.py` 頂部修改 `HOST` / `PORT`。
> API 互動文件（Swagger UI）：`http://localhost:8080/docs`

---

## 開發者設定

### 1. 安裝所有套件（Python + Node.js）

```bash
# Linux / macOS
bash scripts/linux/setup.sh --dev

# Windows
scripts\windows\setup.bat --dev
```

### 2. 開發模式（HMR 熱更新）

開兩個 terminal，前端改動即時反映、不需重整：

```bash
# Terminal 1：FastAPI（API server，port 8080）
python3 backend/server.py

# Terminal 2：Vite dev server（port 5173）
cd frontend && npm run dev
```

訪問 `http://localhost:5173`，修改 `.vue` 元件即時更新。
（Vite 會自動把 `/api`、`/avatars`、`/weekly_data` 代理到 :8080）

### 3. Build 前端（更新 `dist/`）

修改前端後，需重新 build 才會反映到生產的 `http://localhost:8080`：

```bash
cd frontend && npm run build      # 產出至 dist/

# 或透過 start 腳本一併重啟
bash scripts/linux/start.sh restart --build   # Linux / macOS
scripts\windows\start.bat restart --build      REM Windows
```

---

## 功能特色

### 個人便條紙看板
- 中欄為個人私有便條紙，每人上限 30 張，資料存於 `data/notes.json`
- 三種類型（新增時選擇）：**純文字** / **標題+內文** / **待辦清單**
- 待辦清單卡片可直接點擊 checkbox 切換完成狀態，無需開啟編輯器
- 9 種顏色（預設 + 8 種彩色）可自選

### 任務管理
- 任務以建議執行面板（左欄）管理，依逾期 → Q1→Q4 → 截止日期排序
- 截止日期設定、逾期自動標記
- 任務標題 / 說明 inline 編輯（詳情側欄）
- 留言討論與愛心 reaction
- 多人認領（顯示堆疊頭像）
- 深度連結：每個任務皆有獨立 URL（`/:id`），可一鍵複製分享
- 詳情側欄可直接刪除任務

### 標籤系統
- 每個任務支援多個自訂標籤
- 標籤 filter 面板：點選任一標籤可篩選

### 關鍵字搜尋
- 全局搜尋列，即時搜尋任務標題、說明、留言內容，結果高亮

### 已完成任務
- Header「已完成」按鈕顯示 / 隱藏完成面板（位於便條紙下方）
- 依本週 / 上週 / 更早分組；可拖曳回建議面板恢復
- 已加入週報的任務顯示「▶ 週報」標籤

### 週報 PPT 自動生成
- Task 標記完成時，可選擇填寫說明 + 上傳截圖（含各圖說明）
- 資料存於 `weekly_data/YYYY-WXX/` 資料夾
- 上傳自訂 `.pptx` 模板後，一鍵生成與模板樣式一致的週報
- 按人員排序，Content 頁依 Project 分組

### 多人即時協作
- Server-Sent Events (SSE) 長連線即時同步
- 任何變更（任務 / 用戶 / 留言 / 請假 / 積分）均即時廣播
- Teams 風格右下角通知卡片

### 用戶系統
- 首次進入自動以 IP 識別，引導設定名稱與頭像
- 頭像支援 emoji 選取 或 自訂圖片上傳（PNG / JPG / GIF / WebP）

### 請假系統
- 登記請假日期（支援起迄區間）並附備註
- 假期清單自動過濾過去日期

### 每週火箭積分 (Rocket Voting)
- 每週每人一票，火箭總數累計顯示於右側面板排行榜
- 投票後觸發全屏慶祝動畫與粒子特效

### 使用手冊
- Header 提供「使用手冊」按鈕，點擊開啟操作說明 modal
- 涵蓋：便條紙、任務操作、Tag 系統、認領協作、關鍵字搜尋、分享連結、請假公告、火箭積分投票、週報 PPT 生成
- 手機版自動隱藏文字只顯示圖示，點外部或 ✕ 關閉

---

## 專案結構

```
taskManager_git/
├── frontend/               ← Vue 3 + Vite 專案
│   ├── index.html          # Vite entry（掛載 #app）
│   ├── style.css           # 全域 CSS
│   ├── package.json
│   ├── vite.config.js      # dev proxy + build 設定
│   └── src/
│       ├── main.js         # Vue app 入口
│       ├── App.vue         # 根元件，載入所有 store + component
│       ├── api.js          # HTTP 呼叫層
│       ├── composables/    # 共用工具（avHTML、esc、COLORS…）
│       ├── stores/         # Pinia stores（user / tasks / notes / chat / leaves / points / sse / weekly）
│       └── components/     # Vue 元件（SetupScreen / AppHeader / SugPanel / NotesBoard…）
│       ├── setup-screen.html
│       ├── header.html
│       ├── help-modal.html
│       ├── mob-tabs.html
│       ├── layout.html     # 主布局（建議面板 + 便條紙 + 聊天室）
│       ├── notes-board.html # 便條紙看板 + 已完成面板
│       ├── matrix.html     # （保留，目前未使用）
│       ├── drawer.html     # 任務詳情側欄
│       ├── task-modal.html
│       ├── leave-modal.html
│       ├── vote-modal.html
│       ├── note-modal.html # 便條紙類型選擇 + 編輯 modal
│
├── dist/                   ← vite build 產出（gitignored，FastAPI serve）
│
├── backend/
│   ├── server.py           # FastAPI 應用、SSE、所有 API 路由
│   ├── ppt_generator.py    # 週報 PPT 生成邏輯（python-pptx）
│   └── requirements.txt    # fastapi, uvicorn, python-multipart, python-pptx
│
└── data/                   # runtime 資料（gitignored，server 自動建立）
    ├── tasks.json
    ├── users.json
    ├── chat.json
    ├── leaves.json
    ├── points.json
    ├── notes.json          # 個人便條紙資料
    ├── weekly_config.json
    └── ppt_template.pptx   # 上傳的週報模板（若有）
```

**其他 runtime 目錄（gitignored）：**
- `avatars/` — 用戶上傳頭像
- `history/` — 每日操作日誌 `YYYY-MM-DD.jsonl`
- `weekly_data/` — 週報任務資料（說明 + 圖片）

---

## API 端點

| 方法 | 路由 | 功能 |
|------|------|------|
| GET | `/api/ip` | 取得客戶端 IP |
| GET | `/api/tasks` | 取得團隊任務列表 |
| GET | `/api/users` | 取得用戶列表 |
| GET | `/api/chat` | 取得留言板訊息 |
| GET | `/api/leaves` | 取得請假紀錄 |
| GET | `/api/notes?name=X` | 取得個人便條紙 |
| GET | `/api/points` | 取得火箭積分排行 |
| GET | `/api/events` | SSE 即時事件流 |
| POST | `/api/tasks` | 同步任務並廣播 |
| POST | `/api/users` | 儲存用戶資料並廣播 |
| POST | `/api/chat` | 發送留言並廣播 |
| POST | `/api/leaves` | 新增 / 刪除請假 |
| POST | `/api/notes` | 儲存個人便條紙 |
| POST | `/api/upload-avatar` | 上傳頭像 |
| POST | `/api/points/vote` | 提交火箭投票 |
| POST | `/api/history` | 記錄操作歷史 |
| GET/POST | `/api/weekly-config` | 週報設定（主題、報告人）|
| GET | `/api/weekly-records` | 本週任務記錄列表 |
| GET | `/api/weekly-record?taskId=X` | 單一任務記錄 |
| POST | `/api/weekly-record` | 儲存任務說明 + 圖片 |
| GET | `/api/ppt-template-info` | 模板上傳狀態 |
| POST | `/api/upload-ppt-template` | 上傳 PPT 模板 |
| POST | `/api/generate-ppt` | 生成並下載週報 PPTX |
| POST | `/api/clear-weekly-history` | 清除非本週週報資料 |
