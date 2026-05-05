# Task Manager — 艾森豪威爾矩陣任務管理系統

基於**艾森豪威爾矩陣 (Eisenhower Matrix)** 的多人協作任務管理系統，支援即時同步、個人任務、留言討論等功能。

---

## 需求 Requirements

- **Python 3.6+**（僅使用標準函式庫，無需安裝額外套件）
- 現代瀏覽器（Chrome / Firefox / Edge / Safari）

---

## 啟動方式

```bash
python3 server.py
```

啟動後開啟瀏覽器訪問：

```
http://localhost:8080
```

局域網內其他裝置可透過主機 IP 訪問：

```
http://<主機IP>:8080
```

> 預設監聽 `0.0.0.0:8080`，可在 `server.py` 頂部修改 `HOST` / `PORT`。

---

## 功能特色

### 任務管理
- 四象限矩陣（Q1 緊急重要 → Q4 不緊急不重要）
- 拖放移動象限、截止日期、逾期標記
- 任務詳情側欄：inline 編輯標題 / 說明、留言討論、愛心 reaction
- 已完成分組（本週 / 上週 / 更早）

### 個人 & 團隊模式
- 團隊模式：共用四象限，即時多人同步
- 個人模式：私人任務列表，資料存在 server 但不廣播給他人

### 多人協作
- Server-Sent Events (SSE) 即時同步
- 多人認領任務（顯示堆疊頭像）
- 全域團隊留言板
- Teams 風格右下角通知卡片

### 請假系統
- 登記請假日期（可設區間）
- 當天 09:00 自動顯示請假提醒

### 其他
- 響應式設計（桌面 / 手機）
- 常用指令面板
- 用戶頭像支援 emoji 或自訂圖片上傳

---

## 專案結構

```
taskManager_git/
├── index.html          # 前端 SPA（HTML + CSS + JS，無框架）
├── server.py           # Python HTTP 伺服器
│
├── tasks.json          # 團隊任務資料（自動生成）
├── users.json          # 用戶資料（自動生成）
├── leaves.json         # 請假紀錄（自動生成）
├── personal_tasks.json # 個人任務（自動生成）
├── quick_cmds.json     # 常用指令（自動生成）
├── chat.json           # 留言板訊息（自動生成）
│
├── avatars/            # 用戶上傳頭像（自動生成）
└── history/            # 每日操作日誌 YYYY-MM-DD.jsonl（自動生成）
```

> `*.json`、`avatars/`、`history/` 由 server 自動建立，無需手動建立。

---

## API 端點

| 方法 | 路由 | 功能 |
|------|------|------|
| GET | `/api/ip` | 取得客戶端 IP |
| GET | `/api/tasks` | 取得團隊任務列表 |
| GET | `/api/users` | 取得用戶列表 |
| GET | `/api/chat` | 取得留言板訊息 |
| GET | `/api/leaves` | 取得請假紀錄 |
| GET | `/api/personal-tasks?name=X` | 取得個人任務 |
| GET | `/api/quick-cmds` | 取得常用指令 |
| GET | `/api/events` | SSE 即時連線 |
| POST | `/api/tasks` | 同步任務列表 |
| POST | `/api/users` | 儲存用戶資料 |
| POST | `/api/chat` | 發送留言板訊息 |
| POST | `/api/leaves` | 新增 / 刪除請假 |
| POST | `/api/personal-tasks` | 儲存個人任務 |
| POST | `/api/quick-cmds` | 儲存常用指令 |
| POST | `/api/upload-avatar` | 上傳頭像（multipart） |
| POST | `/api/history` | 記錄操作歷史 |
