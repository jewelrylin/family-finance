# 家庭財務管理系統

家庭收支及投資理財網頁，支援多家庭分組、語音記帳、財務圖表分析。

## 功能

- Email 註冊/登入
- 家庭分組（邀請碼）
- 收入 / 支出 / 投資記錄
- 語音輸入記帳
- 財務分析（直線圖、長條圖、圓餅圖）
- 管理員密碼重設

## 技術架構

- **前端**: React + Vite + Recharts
- **後端**: Node.js + Express
- **資料庫**: Supabase (PostgreSQL) / SQLite (開發用)
- **部署**: Netlify (前端) + Render (後端 API)

## 快速開始

```bash
# 安裝依賴
cd server && npm install
cd ../client && npm install

# 啟動開發環境
cd .. && npm run dev
# 前端: http://localhost:5173
# 後端: http://localhost:3001
```

## 環境變數

複製 `.env.example` 為 `.env`，填入 Supabase 資訊即可啟用資料庫連線。

## 部署

### 後端 (Render)
1. 在 Render 建立 Web Service，連接到此 GitHub repo
2. Build Command: `cd server && npm install`
3. Start Command: `cd server && node index.js`
4. 設定環境變數：`SUPABASE_URL`, `SUPABASE_KEY`, `JWT_SECRET`

### 前端 (Netlify)
1. 在 Netlify 匯入此 GitHub repo
2. Build Command: `cd client && npm install && npm run build`
3. Publish directory: `client/dist`
4. 設定 redirect 規則（`netlify.toml` 已包含）
# RLS 已在 Supabase 禁用 - 重新部署觸發
