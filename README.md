# Task Manager — 多人協作任務管理系統

多人協作任務管理系統，含個人便條紙看板與週報 PPT 自動生成。純 Python 標準函式庫驅動，前端無框架。

---

## 需求 Requirements

- **Python 3.10+**
- 現代瀏覽器（Chrome / Firefox / Edge / Safari）

---

## Before Start — 安裝套件

首次使用請先執行安裝腳本，自動安裝 `fastapi`、`uvicorn`、`python-multipart`、`python-pptx`：

| 系統 | 腳本路徑 |
|------|---------|
| Linux / macOS | `scripts/linux/setup.sh` |
| Windows | `scripts\windows\setup.bat` |

```bash
# Linux / macOS
bash scripts/linux/setup.sh

# 或直接安裝
pip install -r backend/requirements.txt
```

---

## Start — 啟動伺服器

腳本位於 `scripts/linux/` 和 `scripts/windows/`，支援前景與背景兩種模式。

### Linux / macOS

```bash
# 前景執行（Ctrl+C 停止）
bash scripts/linux/start.sh

# 背景執行
bash scripts/linux/start.sh start

# 停止背景伺服器
bash scripts/linux/start.sh stop

# 重啟背景伺服器
bash scripts/linux/start.sh restart

# 查看執行狀態
bash scripts/linux/start.sh status
```

### Windows

```bat
REM 前景執行（Ctrl+C 停止）
scripts\windows\start.bat

REM 背景執行
scripts\windows\start.bat start

REM 停止背景伺服器
scripts\windows\start.bat stop

REM 重啟背景伺服器
scripts\windows\start.bat restart

REM 查看執行狀態
scripts\windows\start.bat status
```

啟動後開啟瀏覽器訪問：`http://localhost:8080`

> API 互動文件（Swagger UI）：`http://localhost:8080/docs`

局域網內其他裝置：`http://<主機IP>:8080`

> 背景模式的日誌輸出至 `server.log`，PID 記錄於 `server.pid`。
> 預設監聽 `0.0.0.0:8080`，可在 `backend/server.py` 頂部修改 `HOST` / `PORT`。

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
├── frontend/
│   ├── index.html          # HTML shell（載入 loader.js）
│   ├── style.css           # 所有 CSS 樣式
│   ├── api.js              # fetch / HTTP 呼叫層
│   ├── loader.js           # 並行載入 partials，再載入 app.js
│   ├── app.js              # 應用邏輯、render、事件處理
│   └── partials/           # HTML 模組（每個 UI 區塊獨立一檔）
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
│       ├── weekly-confirm.html
│       ├── weekly-record.html
│       └── ppt-modal.html
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
