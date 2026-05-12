# Task Manager — 艾森豪威爾矩陣任務管理系統

基於**艾森豪威爾矩陣 (Eisenhower Matrix)** 的多人協作任務管理系統，純 Python 標準函式庫驅動，無需安裝任何第三方套件。

---

## 需求 Requirements

- **Python 3.6+**（僅使用標準函式庫）
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
- 拖放任務至任意象限；空白區域點擊可快速新增
- 截止日期設定、逾期自動標記
- 任務標題 / 說明 inline 編輯（詳情側欄）
- 留言討論與愛心 reaction
- 多人認領（顯示堆疊頭像）
- 深度連結：每個任務皆有獨立 URL（`/:id`），可一鍵複製分享

### 標籤系統
- 每個任務支援多個自訂標籤
- 標籤 filter 面板：點選任一標籤可跨象限篩選
- 新增任務時可從已存在的標籤中自動補全

### 關鍵字搜尋
- 全局搜尋列，即時搜尋任務標題、說明、留言內容
- 搜尋結果高亮顯示

### 已完成任務
- 已完成任務自動收入「Done」面板
- 依時間分組（本週 / 上週 / 更早）
- 可點擊已完成任務開啟詳情；支援拖曳回象限恢復

### 個人 & 團隊模式
- **團隊模式**：共用四象限，即時廣播給所有連線者
- **個人模式**：私人任務列表，資料儲存於 server 但不廣播

### 多人即時協作
- Server-Sent Events (SSE) 長連線即時同步
- 每 25 秒自動 ping 維持連線
- 任何變更（任務 / 用戶 / 留言 / 請假 / 積分）均即時廣播
- Teams 風格右下角通知卡片 + 瀏覽器原生通知

### 用戶系統
- 首次進入自動以 IP 識別，引導設定名稱與頭像
- 頭像支援 emoji 選取 或 自訂圖片上傳（PNG / JPG / GIF / WebP）
- Favicon 自動同步為當前用戶頭像
- 可隨時在設定中修改名稱 / 頭像

### 請假系統
- 登記請假日期（支援起迄區間）並附備註
- 當天 09:00 自動彈出全屏請假提醒
- 假期清單自動過濾過去日期

### 每週火箭積分 (Rocket Voting)
- 每週每人一票：為本週最傑出貢獻的隊友投出一枚火箭
- 需指定任務作為投票依據
- 火箭總數累計顯示於右側面板排行榜
- 投票後觸發全屏慶祝動畫與粒子特效
- 票數即時廣播給所有連線者

### 全域團隊留言板
- 即時聊天，最多保留 200 則訊息
- 支援多行訊息，顯示頭像與時間戳

### 操作歷史
- 每次任務變更自動記錄至 `history/YYYY-MM-DD.jsonl`
- 事件即時廣播，可用於稽核或 debug

### 介面 & 體驗
- 響應式設計（桌面 / 手機）
- 手機版底部 Tab 導航（矩陣 / 個人 / 留言）
- 可拖曳調整各面板寬度
- Toast 通知、慶祝動畫
- 點陣背景、JetBrains Mono 字型風格

---

## 專案結構

```
taskManager/
├── index.html          # 前端 SPA（HTML + CSS + JS，無框架）
├── server.py           # Python HTTP 伺服器（標準函式庫）
│
├── tasks.json          # 團隊任務資料（自動生成）
├── users.json          # 用戶資料（自動生成）
├── leaves.json         # 請假紀錄（自動生成）
├── personal_tasks.json # 個人任務（自動生成）
├── chat.json           # 留言板訊息（自動生成）
├── points.json         # 火箭積分 & 投票紀錄（自動生成）
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
| GET | `/api/leaves` | 取得請假紀錄（自動過濾過期） |
| GET | `/api/personal-tasks?name=X` | 取得指定用戶的個人任務 |
| GET | `/api/points` | 取得火箭積分排行 & 本週投票紀錄 |
| GET | `/api/events` | SSE 即時事件流 |
| POST | `/api/tasks` | 同步任務列表並廣播 |
| POST | `/api/users` | 儲存 / 更新用戶資料並廣播 |
| POST | `/api/chat` | 發送留言並廣播 |
| POST | `/api/leaves` | 新增 / 刪除請假並廣播 |
| POST | `/api/personal-tasks` | 儲存個人任務 |
| POST | `/api/upload-avatar` | 上傳頭像（multipart/form-data） |
| POST | `/api/points/vote` | 提交每週火箭投票並廣播 |
| POST | `/api/history` | 記錄操作歷史並廣播 |

### SSE 事件類型

| `type` | 觸發時機 |
|--------|---------|
| `sync` | 任務列表更新 |
| `user_update` | 用戶資料變更 |
| `chat` | 新留言 |
| `leave_update` | 請假新增 / 刪除 |
| `points_update` | 火箭投票送出 |
| *(history entry)* | 任意操作歷史事件 |
