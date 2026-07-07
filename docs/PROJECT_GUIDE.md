# WLPEF Youth Project Guide

最後更新：2026-06-14

## 1. 專案定位
本專案是「領袖會社青團」的會員與活動管理平台，核心目標是整合：

- 使用者登入與帳號資料管理
- 行事曆活動發布與報名入口
- Google 表單/試算表報名同步
- 點數交易查詢與後台管理

前端採 Nuxt 4（Vue 3），後端依賴 Supabase（Auth、Postgres、Storage、Edge Functions）。

## 2. 技術與版本
- Nuxt: `^4.4.2`
- Vue: `^3.5.30`
- Vue Router: `^5.0.4`
- Tailwind CSS: `^3.4.1`
- Vant: `^4.9.1`
- Nuxt Supabase Module: `^2.0.4`
- TypeScript 型別檢查：`nuxt typecheck`

## 3. 功能現況

### 3.1 驗證與帳號流程
- Email/密碼登入、註冊、忘記密碼、重設密碼
- **驗證介面優化**：統一使用 `AuthInputField.vue` 元件，提升視覺一致性並支援密碼顯示切換。
- OAuth 登入：Google、Apple
- 註冊時重複 Email 偵測：呼叫 Edge Function `check-user-registration`
- OAuth callback (`/auth/confirm`) 會嘗試觸發 `merge-duplicate-account`，整併同 Email 重複帳號
- `auth` middleware 會確保已登入使用者具備 `profiles` 資料，不完整時導向補填流程

### 3.2 活動與日曆
- 首頁顯示「進行中或即將到來」活動
- 月曆支援月份切換、日期選擇、活動標記
- 活動狀態：`draft` / `published` / `closed`
- 一般會員只看 `published` 活動；管理員可看全部狀態
- 管理員可於活動編輯器新增/編輯/刪除活動，欄位包含：
  - 基本資料（名稱、地點、描述、顏色、全天）
  - 外部整合（Google Form URL、Google Sheet ID）
  - 點數規則（registration_bonus、checkin_bonus、raffle_threshold）

### 3.3 報名與同步
- 會員端活動詳情按鈕會開啟 `google_form_url` 到外部表單
- 後台報名頁可查看活動報名名單與完整原始欄位（`raw_data`）
- 管理員可手動觸發 `sync-google-sheet`，把試算表資料 upsert 到 `event_registrations`
- 同步流程會更新 `events.participants`（以 email 去重）
- **報名狀態追蹤**：支援 `invitation_sent_at` 欄位（未來擴充邀請機制使用）。

### 3.4 點數與簽到
- 會員端可看個人點數紀錄。
- 管理端可查全站點數交易與明細。
- **簽到掃描權限**：`profiles` 新增 `scan_permission` 欄位。管理員可於「會員管理」中授權一般成員協助活動簽到。
- 具備掃描權限的成員可進入管理介面進行 QR Code 掃描簽到。

### 3.5 公告
- 目前首頁有內建「最新公告」區塊（前端靜態資料）。
- 「查看全部」尚未開放獨立公告列表頁。

### 3.6 抽獎中獎即時通知
**完整文件見 `docs/raffle-feature.md`**（架構、DB 函式、端點、前端、操作手冊、設定）。摘要：

- 合格條件：`profiles.points >= events.raffle_threshold` 且 `role <> 'admin'`；同活動已中獎者後續排除。
- **不使用 Realtime**（免費版 ~200 連線上限）；手機輪詢一支 CDN 可快取端點，「是不是我中獎」由前端比對。
- DB 函式：`draw_raffle`（開獎，admin only）、`get_raffle_candidates`（合格名單，admin only）、`get_active_raffle`（中獎名單，**anon** 可讀）。
- 端點 `GET /api/lottery/active`：用既有 anon key 呼叫 `get_active_raffle()`，**不需 service role key**；`Cache-Control: s-maxage=2` 讓 Vercel CDN 擋流量。
- 前端：
  - 全域通知掛在 `app/layouts/default.vue`（`useRaffleNotifier`）→ 會員任何頁都可收到，含**雙層 gating**（活動時間窗 + `raffle_active`）。
  - 後台控制台 `/admin/raffle`（逐輪手動抽、撤回、合格人數）；管理首頁有「抽獎控制」入口。
  - 測試頁 `/raffle`（無 gating，調試用）。
- 環境變數只需 `SUPABASE_URL` / `SUPABASE_KEY`。限制：僅 App 內提示（鎖屏/背景會暫停），未做背景推播。

## 4. 路由、Layout、權限規則

### 4.1 Layout
- `default`: 一般會員頁
- `admin`: 後台頁
- `auth`: 登入/註冊/驗證流程

### 4.2 Middleware
- `auth`: 驗證登入狀態、密碼重設流程導向、確保 profile 存在
- `admin`: 限制管理頁僅 `role === 'admin'` (部分簽到功能則額外檢查 `scan_permission`)

### 4.3 Tabbar 規則
- 顯示與 active 狀態透過 `definePageMeta` 的 `showTabbar`、`tabbarKey` 控制
- Tabbar 項目由 `app/config/tabbar.ts` 統一提供：
  - 會員：首頁、QR Code、會員中心
  - 管理員：首頁、管理設定

## 5. 資料模型重點
主要表格以 `supabase/full_schema.sql` 與 `supabase/migrations` 為準：

- `profiles`: 會員資料（name、role、points、avatar_url、email、**scan_permission**）
- `events`: 活動主檔（時間、狀態、外部整合欄位、點數規則）
- `event_registrations`: 報名同步紀錄（matched_user_id、google_sheet_row_id、raw_data、**invitation_sent_at**）
- `point_transactions`: 點數異動紀錄
  - `type`：`registration`（報名）/ `checkin`（現場簽到）/ `feedback`（回饋表單）/ `checkin_form`（打卡表單）/ `manual`（手動調整）/ `bonus`（其他獎勵）
  - `UNIQUE(user_id, event_id, type)`：同一來源每人每活動最多發一次，各發點來源必須使用各自的 type
- `checkin_records`: 簽到紀錄
- `events`：另含 **`raffle_active`**（抽獎進行中開關）
- `raffle_winners`: 抽獎中獎名單（event_id、user_id、round、name、points；`UNIQUE(event_id, user_id)`）

## 6. Edge Functions

### 6.1 `check-user-registration`
- 用途：註冊時判斷 Email 是否已存在、是否為社群帳號
- 使用情境：`app/pages/auth/register.vue`
- 需要環境變數：
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`

### 6.2 `merge-duplicate-account`
- 用途：同 Email 多帳號時，整併 profile 與關聯資料後刪除重複 auth user
- 使用情境：`app/pages/auth/confirm.vue`
- 需要環境變數：
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `SUPABASE_ANON_KEY`（程式亦支援 `SUPABASE_ANON_KEYS`）

### 6.3 `sync-google-sheet`
- 用途：讀取 Google Sheet 報名／回饋／打卡表單資料，寫入 `event_registrations`、`event_feedback_responses`、`event_checkin_responses`，結尾觸發 `process_pending_points()` 結算點數
- 支援：
  - 指定單一活動同步（傳入 `eventId` + `sheetId`），不受時間窗口限制
  - 預設只同步近期且 `status = published` 的活動，不再全站掃描所有有 `google_sheet_id` 的活動
- 排程：目前 cron 會每分鐘同步近期且已發布的活動，時間窗口分兩種（由 `trigger_google_sheet_sync()` 的 body 參數控制）：
  - 報名 sheet：`recentPastDays: 0`，活動結束即停止同步
  - 回饋／打卡表單 sheet：`formsPastDays: 7`，活動結束後 7 天內仍持續同步（讓晚填表單或晚註冊帳號者能被配對、補發點數）
- 調整窗口天數：建新 migration 重建 `trigger_google_sheet_sync()`（參考 `20260707000002_extend_form_sync_window.sql`），只改 body 裡的天數後 `supabase db push`，下一分鐘 cron 即生效，Edge Function 不用重新部署
  - 各參數上限：`recentPastDays` / `formsPastDays` 為 180、`recentFutureDays` 為 365，超過會被 Edge Function 壓回上限；`formsPastDays: 0` 等於回到活動結束即停
  - 不要直接在 SQL Editor 改線上 function，會造成 repo 與線上 schema drift；緊急改了要回頭補相同內容的 migration
- 驗證：要求 `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>`
- 需要環境變數：
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `GCP_SERVICE_ACCOUNT`（JSON 字串，需具試算表唯讀權限）

### 6.4 `supabase/config.toml` 狀態
目前設定檔已啟用：
- `sync-google-sheet`
- `merge-duplicate-account`

`check-user-registration` 雖有程式碼，但尚未出現在 `supabase/config.toml` 區段；部署時請確認已手動 deploy 或補入設定。

## 7. 本機開發與檢查

### 7.1 必要環境變數（Nuxt 前端）
建立 `.env`：

```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key
```

### 7.2 常用指令
```bash
pnpm install
pnpm dev
pnpm typecheck
pnpm build
pnpm preview
```

## 8. 專案結構（摘要）
- `app/pages`: 路由頁面（admin/auth/member）
- `app/services`: 與 Supabase 互動的資料層
- `app/composables`: 狀態與業務流程（calendar、user、editor...）
- `app/config`: Tabbar 與點數交易型別對照
- `app/types`: 型別定義與資料模型
- `supabase/functions`: Edge Functions
- `supabase/full_schema.sql`: DB schema 主文件
- `supabase/fixes`: 既有修補 SQL

## 9. 維護建議
- 新增或調整功能時，同步更新：
  - `README.md`（快速啟動與環境變數）
  - 本文件（功能現況與資料流）
  - `supabase/config.toml`（若新增/調整 Edge Function）

### 9.1 Migration 結構注意事項（重要）
本專案的 migration **不是自足的**：基線 schema 由 `supabase/full_schema.sql` **手動套用**（在 Studio SQL Editor 跑），`supabase/migrations/` 只是上面的增量補丁。例如 `20260608_*` 直接 `ALTER TABLE public.event_registrations`，但沒有任何 migration 去 `CREATE` 該基礎表。

影響與規則：
- ✅ 可用：`supabase db push`（直接往遠端套增量）、`supabase db dump`（直接撈遠端 schema）。
- ❌ 會壞：`supabase db diff`、任何「從空白重放 migration」的 shadow-DB 工具 —— 因為基礎表不存在，重放到第一支 `ALTER` 就失敗（`relation ... does not exist`）。
- **migration 檔名用 14 位時間戳**（`YYYYMMDDHHMMSS_desc.sql`）。Supabase 以「檔名開頭數字」為 version，同日多支若只用 8 位日期會**撞號**。
- 既有測試/正式專案若出現孤兒歷史（remote 有、local 無），用 `supabase migration repair --status reverted <version>` 對齊**帳本**（不動 schema），再 `db push`。
- 想讓 `db diff` 等工具可用，未來可補一支「baseline migration」把 `full_schema.sql` 納入版控起點（屬較大重構，動前先評估）。
