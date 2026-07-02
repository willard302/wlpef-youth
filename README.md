# WLPEF Youth

領袖會社青團活動與會員平台。

以 Nuxt 4 + Supabase 為核心，提供活動行事曆、報名同步、點數管理、會員中心與管理後台。

## 目前功能
- 會員 / 管理員分流版型與權限 middleware
- 活動管理（草稿、發佈、關閉）與日曆檢視
- 活動報名名單管理與 Google Sheet 同步
- 點數紀錄（會員端與管理端）
- Email / 密碼登入、Google / Apple OAuth、重設密碼
- 社群帳號重複 Email 偵測與帳號合併流程

## 技術棧
- Nuxt 4 (Vue 3)
- Tailwind CSS
- Vant UI
- Supabase (Auth / Database / Storage / Edge Functions)
- TypeScript

## 快速開始
1. 安裝相依套件

```bash
pnpm install
```

2. 設定環境變數（建立 `.env`）

```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key
```

3. 啟動開發環境

```bash
pnpm dev
```

## 常用指令
- `pnpm dev`: 啟動 Nuxt 開發伺服器
- `pnpm typecheck`: 執行型別檢查
- `pnpm build`: 建置正式版
- `pnpm preview`: 預覽建置結果
- `pnpm generate`: 產生靜態輸出

## Edge Functions 環境變數
若需啟用 `supabase/functions` 底下功能，請於 Supabase 專案設定：

- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`（`merge-duplicate-account` 會使用）
- `GCP_SERVICE_ACCOUNT`（`sync-google-sheet` 需要，內容為 service account JSON）

## 抽獎中獎即時通知
活動抽獎環節：後台 `/admin/raffle` 開獎，合格者手機在 App 內即時跳「恭喜中獎」。
不使用 Realtime（避開免費版連線上限），手機輪詢 `GET /api/lottery/active`（以 anon key 呼叫 `get_active_raffle()`、`s-maxage=2` 走 Vercel CDN 快取），**不需 service role key**——只要 `SUPABASE_URL` / `SUPABASE_KEY` 設定正確即可（本機與 Vercel 皆同）。

完整說明（架構 / DB 函式 / 前端 / 操作手冊 / 設定）見 **`docs/raffle-feature.md`**。

## 文件
- 專案指南：`docs/PROJECT_GUIDE.md`

## 更新日期
- 2026-06-24
