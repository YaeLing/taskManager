# Claude Code 設定

## 語言設定
- 使用**繁體中文**進行所有回應

---

## 專案概覽：任務優先級管理系統 (Task Manager)

### 專案目的
基於**艾森豪威爾矩陣 (Eisenhower Matrix)** 的任務優先級管理系統，將任務分為 4 個象限：
- **Q1**: 緊急 & 重要 (紅色 `#b8726a`)
- **Q2**: 緊急 & 不重要 (橙色 `#b89460`)
- **Q3**: 不緊急 & 重要 (綠色 `#6a9a78`)
- **Q4**: 不緊急 & 不重要 (藍色 `#7a88b8`)

### 技術棧

**前端：**
- HTML5 單頁應用 (SPA)
- CSS3 (Grid, Flexbox, CSS Variables, 動畫)
- Vanilla JavaScript (無框架)
- Google Fonts (JetBrains Mono)
- LocalStorage 本地緩存

**後端：**
- Python 3 內建 HTTP 伺服器 (`http.server`)
- 多線程支援 (`ThreadingHTTPServer`)
- Server-Sent Events (SSE) 實時同步

**數據存儲：**
- `tasks.json` - 任務數據
- `users.json` - 用戶資料
- `chat.json` - 團隊留言板訊息（最多 200 則）
- `history/YYYY-MM-DD.jsonl` - 每日操作日誌
- `avatars/` - 用戶自訂頭像

### 檔案結構
```
taskManager_git/
├── index.html          # 前端 SPA (HTML + CSS + JS)
├── server.py           # Python HTTP 伺服器
├── claude.md           # Claude Code 專案記憶
├── tasks.json          # 任務數據 (運行時生成)
├── users.json          # 用戶數據 (運行時生成)
├── chat.json           # 留言板數據 (運行時生成)
├── avatars/            # 用戶頭像目錄
└── history/            # 操作歷史日誌
```

---

## UI 佈局

### 桌面版 (3 欄佈局)
```
┌─────────────────────────────────────────────────────────────┐
│                         Header                              │
│  Logo | 統計 (全部/完成/待辦) | 用戶資料 | 新增任務按鈕     │
├───────────┬─────────────────────────────┬───────────────────┤
│           │         四象限矩陣          │                   │
│  建議     │  ┌─────────┬─────────┐      │    團隊留言板     │
│  執行     │  │   Q1    │   Q2    │      │                   │
│  順序     │  │緊急重要 │緊急不重要│      │   即時討論區      │
│           │  ├─────────┼─────────┤      │                   │
│  (300px)  │  │   Q3    │   Q4    │      │    (280px)        │
│           │  │不緊急重要│不緊急不重要│   │                   │
│           │  └─────────┴─────────┘      │                   │
│           ├─────────────────────────────┤                   │
│           │        已完成區域           │                   │
└───────────┴─────────────────────────────┴───────────────────┘
```

### 手機版 (Tab 切換)
- 象限 | 建議順序 | 已完成 | 留言板

---

## 主要功能

### 任務管理
- 拖放 (Drag & Drop) 任務移動象限
- 任務優先級建議排序 (依象限 + 截止日期)
- 任務完成追蹤（記錄完成時間）
- **已完成任務分組**：本週 / 上週 / 更早之前
- 逾期任務標記

### 多人協作
- **多人認領任務**：同一任務可被多人接手，顯示堆疊頭像
- 用戶頭像：支援 emoji 或自訂圖片上傳
- 任務評論：針對特定任務的討論

### 團隊留言板
- 全域即時討論區（右側面板）
- SSE 即時同步新訊息
- 最多保留 200 則訊息

### 通知系統 (Teams 風格)
- 右下角堆疊式通知卡片（最多 5 個）
- 顯示發送者頭像、名稱、動作、時間
- 音效提示（Web Audio API）
- 點擊跳轉到相關任務/留言板
- 6 秒後自動消失，可手動關閉
- **會通知**：新增任務、任務狀態更動、留言板新訊息、新增評論
- **不通知**：接手任務、同步事件

### 實時同步
- Server-Sent Events (SSE) 廣播
- 跨設備/跨標籤頁同步
- 自動重連機制 (5 秒)

### 其他
- 響應式設計 (桌面/平板/手機)
- LocalStorage 離線備份
- 歷史操作記錄
- 瀏覽器通知權限

---

## API 端點

| 方法 | 路由 | 功能 |
|------|------|------|
| GET | `/api/ip` | 獲取客戶端 IP |
| GET | `/api/tasks` | 獲取所有任務 |
| GET | `/api/users` | 獲取所有用戶 |
| GET | `/api/chat` | 獲取留言板訊息 |
| GET | `/api/events` | SSE 實時連接 |
| GET | `/avatars/:filename` | 獲取頭像圖片 |
| POST | `/api/users` | 保存用戶資料 |
| POST | `/api/upload-avatar` | 上傳頭像 (multipart) |
| POST | `/api/tasks` | 同步任務列表 |
| POST | `/api/chat` | 發送留言板訊息 |
| POST | `/api/history` | 記錄操作歷史 |

---

## 關鍵數據結構

### 任務物件 (Task)
```javascript
{
  id: 1713350000000,      // 時間戳 ID
  text: "任務標題",        // 必填
  desc: "詳細說明",        // 可選
  due: "2026-04-15",      // 截止日期 (YYYY-MM-DD)
  q: 1,                   // 象限 (1-4)
  done: false,            // 完成狀態
  doneAt: "2026-04-13T10:30:00.000Z", // 完成時間 (ISO 格式)
  handlers: [             // 認領者們（支援多人）
    {
      name: "用戶名",
      avatar: "🐧" | "/avatars/xxx.png",
      avatar_type: "emoji" | "custom"
    }
  ],
  comments: [             // 任務評論
    {
      text: "評論內容",
      ip: "192.168.1.1",
      time: "2026-04-13 10:30",
      name: "評論者",
      avatar: "🐧",
      avatar_type: "emoji"
    }
  ]
}
```

### 用戶資料 (User Profile)
```javascript
{
  name: "使用者名稱",
  avatar: "🐧" | "/avatars/xxx.png",
  avatar_type: "emoji" | "custom",
  updated: "2026-04-13"
}
```

### 留言板訊息 (Chat Message)
```javascript
{
  id: 1713350000000,      // 時間戳 ID
  text: "訊息內容",
  ip: "192.168.1.1",
  time: "2026-04-13 10:30",
  name: "發送者",
  avatar: "🐧",
  avatar_type: "emoji"
}
```

### SSE 事件類型
```javascript
// 任務同步
{ type: "sync", tasks: [...], from_ip: "..." }

// 留言板訊息
{ type: "chat", message: {...}, from_ip: "..." }

// 用戶更新
{ type: "user_update", user_id: "...", user: {...} }

// 歷史操作通知
{ action: "新增任務", task: "...", user: "...", ip: "..." }
```

---

## 伺服器配置

```python
HOST = "0.0.0.0"  # 監聽所有網卡
PORT = 8080       # 預設端口
```

### 啟動方式
```bash
python server.py
```
然後訪問 `http://localhost:8080`

---

## 關鍵 JS 函數

| 函數 | 用途 |
|------|------|
| `render()` | 主渲染函數，重繪所有 UI |
| `save()` | 保存任務到伺服器（防抖 100ms）|
| `loadTasks()` | 從伺服器載入任務 |
| `loadChat()` | 從伺服器載入留言板 |
| `toggleHandler(id)` | 切換任務認領狀態（多人支援）|
| `toggleDone(id)` | 切換任務完成狀態 |
| `openDrawer(id)` | 打開任務詳情側邊欄 |
| `sendChatMsg()` | 發送留言板訊息 |
| `renderChat()` | 渲染留言板列表 |
| `connectSSE()` | 建立 SSE 連接 |
| `showToast()` | 顯示 Toast 通知 |

---

## 向下相容性

### handler → handlers 轉換
舊版資料使用 `handler`（單一物件），新版使用 `handlers`（陣列）。
程式會自動轉換：
```javascript
if(t.handler && !t.handlers){
  t.handlers = [t.handler];
  delete t.handler;
}
```

顯示時也做相容處理：
```javascript
const handlers = t.handlers || (t.handler ? [t.handler] : []);
```
