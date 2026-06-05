# Claude Code 設定

## 語言
使用**繁體中文**回應。

---

## 專案概覽

艾森豪威爾矩陣 (Eisenhower Matrix) 多人協作任務管理系統，含週報 PPT 自動生成功能。

**技術棧：** Vanilla JS SPA + Python `http.server` 後端 + SSE 即時同步 + JSON 檔案儲存

**啟動：**
```bash
cd backend && python3 server.py
```
→ `http://localhost:8080`（預設 `0.0.0.0:8080`）

---

## 專案結構

```
taskManager_git/
├── frontend/
│   ├── index.html        # HTML 主體
│   ├── style.css         # 所有 CSS
│   ├── api.js            # fetch / HTTP 呼叫層
│   └── app.js            # 應用邏輯、render、事件處理
├── backend/
│   ├── server.py         # HTTP 伺服器、SSE、所有 API 路由
│   └── ppt_generator.py  # 週報 PPT 生成邏輯
└── data/                 # runtime 資料（gitignored，自動建立）
    ├── tasks.json / users.json / chat.json
    ├── leaves.json / points.json / personal_tasks.json
    ├── weekly_config.json
    └── ppt_template.pptx  # 使用者上傳的週報模板
```

**其他 runtime 目錄（gitignored）：** `avatars/` / `history/` / `weekly_data/`

---

## 架構關鍵

**路徑常數（backend/server.py）：**
- `PROJECT_ROOT` = taskManager_git/（backend/ 的上層）
- `SERVE_DIR` = `PROJECT_ROOT / 'frontend'`
- `DATA_DIR` = `PROJECT_ROOT / 'data'`（JSON + ppt_template）

**儲存：** `save()` 防抖 100ms → POST `/api/tasks` → SSE 廣播 → 所有人同步

**渲染：** `render()` 是主渲染入口，重繪四象限 + 建議面板 + 已完成

**Drawer：** `openDrawer(id)` 開側欄，`openTaskId` 記錄當前開啟的 task id

**使用手冊：** `toggleHelp()` / `closeHelp(event)` 控制 `#help-overlay` modal，涵蓋所有功能說明（四象限、任務操作、Tag、搜尋、分享連結、請假、積分投票、週報 PPT）

**週報流程：** Task done → 確認視窗 → 填說明 + 圖片 → 存 `weekly_data/` → PPT modal 上傳模板 → 生成週報

---

## Task 物件欄位

```js
{
  id, text, desc, due,
  q,                         // 象限 1-4
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

## 主要 API

| 方法 | 路由 | 說明 |
|------|------|------|
| GET/POST | `/api/tasks` | 團隊任務 |
| GET/POST | `/api/users` | 用戶資料 |
| GET/POST | `/api/chat` | 留言板 |
| GET/POST | `/api/leaves` | 請假 |
| GET/POST | `/api/personal-tasks` | 個人任務（不廣播 SSE）|
| GET | `/api/events` | SSE 連線 |
| GET | `/api/ip` | 客戶端 IP |
| POST | `/api/upload-avatar` | 上傳頭像 |
| POST | `/api/history` | 操作日誌 |
| GET/POST | `/api/weekly-config` | 週報設定（主題、報告人）|
| GET | `/api/weekly-records` | 本週所有任務記錄 |
| GET | `/api/weekly-record?taskId=X` | 單一任務記錄 |
| POST | `/api/weekly-record` | 儲存任務說明 + 圖片 |
| GET | `/api/ppt-template-info` | 模板上傳狀態 |
| POST | `/api/upload-ppt-template` | 上傳 PPT 模板（存於 data/）|
| POST | `/api/generate-ppt` | 生成並下載週報 PPTX |
| POST | `/api/clear-weekly-history` | 清除非本週週報資料 |
