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

## 活動提醒 Email
推薦使用 Supabase Edge Function `send-event-reminder` 串接 Brevo Transactional Email API。這個方案不使用 SMTP port，適合在 Supabase 遠端手動觸發約 300 封活動提醒信。

主要檔案：

- Edge Function：`supabase/functions/send-event-reminder/index.ts`
- 寄送紀錄表：`supabase/migrations/20260706020001_create_email_delivery_logs.sql`

Supabase secrets 需要設定：

```env
BREVO_API_KEY=
BREVO_SENDER_EMAIL=
BREVO_SENDER_NAME=WLPEF Youth
BREVO_REPLY_TO_EMAIL=
BREVO_REPLY_TO_NAME=
BREVO_EVENT_REMINDER_TEMPLATE_ID=
```

`BREVO_EVENT_REMINDER_TEMPLATE_ID` 可選；若未設定，Function 會使用內建的最小 HTML/Text 內容。若使用 Brevo template，template 變數請使用 `{{params.name}}`、`{{params.email}}`、`{{params.eventTitle}}`、`{{params.eventStartAt}}`、`{{params.eventEndAt}}`、`{{params.eventLocation}}`。

設定 secrets 並部署：

```bash
supabase secrets set BREVO_API_KEY=...
supabase secrets set BREVO_SENDER_EMAIL=...
supabase secrets set BREVO_SENDER_NAME="WLPEF Youth"
supabase secrets set BREVO_EVENT_REMINDER_TEMPLATE_ID=...
supabase db push
supabase functions deploy send-event-reminder
```

Dry-run 只列出本次會寄給誰，不會呼叫 Brevo：

```bash
curl -X POST "https://<project-ref>.supabase.co/functions/v1/send-event-reminder" \
  -H "Authorization: Bearer <admin-or-service-role-token>" \
  -H "Content-Type: application/json" \
  -d '{"eventId":"<event-id>","campaignKey":"event-reminder-20260712","dryRun":true}'
```

測試寄到自己的信箱，不會寫入正式寄送紀錄：

```bash
curl -X POST "https://<project-ref>.supabase.co/functions/v1/send-event-reminder" \
  -H "Authorization: Bearer <admin-or-service-role-token>" \
  -H "Content-Type: application/json" \
  -d '{"eventId":"<event-id>","campaignKey":"event-reminder-20260712","dryRun":false,"limit":5,"testTo":"you@example.com"}'
```

正式寄出：

```bash
curl -X POST "https://<project-ref>.supabase.co/functions/v1/send-event-reminder" \
  -H "Authorization: Bearer <admin-or-service-role-token>" \
  -H "Content-Type: application/json" \
  -d '{"eventId":"<event-id>","campaignKey":"event-reminder-20260712","dryRun":false}'
```

同一個 `eventId` + `campaignKey` 只會寄給尚未成功寄送的人。若 7/8 先寄一次，7/10 再用同一個 `campaignKey` 觸發，會自動排除 7/8 已成功寄送的信箱，只寄給後來新增或前次失敗的報名者。

## 抽獎中獎即時通知
活動抽獎環節：後台 `/admin/raffle` 開獎，合格者手機在 App 內即時跳「恭喜中獎」。
不使用 Realtime（避開免費版連線上限），手機輪詢 `GET /api/lottery/active`（以 anon key 呼叫 `get_active_raffle()`、`s-maxage=2` 走 Vercel CDN 快取），**不需 service role key**——只要 `SUPABASE_URL` / `SUPABASE_KEY` 設定正確即可（本機與 Vercel 皆同）。

完整說明（架構 / DB 函式 / 前端 / 操作手冊 / 設定）見 **`docs/raffle-feature.md`**。

## 文件
- 專案指南：`docs/PROJECT_GUIDE.md`

## 更新日期
- 2026-06-24
