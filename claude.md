# Claude Code 設定

## 語言
使用**繁體中文**回應。

---

## 專案概覽

艾森豪威爾矩陣 (Eisenhower Matrix) 多人協作任務管理系統。

**技術棧：** Vanilla JS SPA（無框架）+ Python `http.server` 後端 + SSE 即時同步 + JSON 檔案儲存

**啟動：** `python3 server.py` → `http://localhost:8080`（預設 `0.0.0.0:8080`）

---

## 架構

- **`index.html`** — 全部前端邏輯（HTML + CSS + JS 合一）
- **`server.py`** — HTTP 伺服器、SSE broadcast、所有 API 路由

**Runtime 資料（gitignored，server 自動建立）：**
`tasks.json` / `users.json` / `chat.json` / `leaves.json` / `points.json` / `personal_tasks.json` / `quick_cmds.json` / `avatars/` / `history/`

---

## 關鍵模式

**儲存：** `save()` 防抖 100ms → POST `/api/tasks` → server 廣播 SSE `{type:"sync"}` → 所有人同步

**渲染：** `render()` 是主渲染入口，重繪四象限 + 建議面板 + 已完成

**Drawer：** `openDrawer(id)` 開側欄，`openTaskId` 記錄當前開啟的 task id

**SSE handler：** 收到 sync 事件時更新 `tasks` 並呼叫 `render()`

---

## Task 物件欄位

```js
{
  id, text, desc, due,       // 基本
  q,                         // 象限 1-4
  done, doneAt,              // 完成狀態
  ticket,                    // boolean，是否為 ticket
  handlers: [{name, avatar, avatar_type}],
  comments: [{text, ip, time, name, avatar, avatar_type, likes:[{name,ip}]}],
  createdBy: {name, avatar, avatar_type},
  createdAt
}
```

**相容性：** 舊資料有 `handler`（單一），新版用 `handlers`（陣列）。讀取時用 `t.handlers || (t.handler ? [t.handler] : [])`

---

## 主要 API

| 方法 | 路由 | 說明 |
|------|------|------|
| GET/POST | `/api/tasks` | 團隊任務 |
| GET/POST | `/api/users` | 用戶資料 |
| GET/POST | `/api/chat` | 留言板 |
| GET/POST | `/api/leaves` | 請假 |
| GET/POST | `/api/personal-tasks` | 個人任務（不廣播 SSE）|
| GET/POST | `/api/quick-cmds` | 常用指令 |
| GET | `/api/events` | SSE 連線 |
| GET | `/api/ip` | 客戶端 IP |
| POST | `/api/upload-avatar` | 上傳頭像 |
| POST | `/api/history` | 操作日誌 |
