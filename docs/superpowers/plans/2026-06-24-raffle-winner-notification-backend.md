# 抽獎中獎即時通知（後端）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立「抽獎開獎 → 手機 App 內即時收到中獎通知」的後端：資料表、開獎 RPC、合格名單 RPC、可被 CDN 快取的輪詢端點。

**Architecture:** 寫入（開獎）走 Postgres `SECURITY DEFINER` 函式保證公正與原子性；讀取（手機輪詢）走一支 Nitro server route，加 `s-maxage` 讓 Vercel CDN 吸收 99% 流量。全程不使用 Supabase Realtime，避開免費版 200 連線限制。

**Tech Stack:** Nuxt 4 (Nitro server routes) on Vercel、Supabase Postgres（SQL migrations）、`@supabase/supabase-js`（server 端 service-role client）。

## Global Constraints

- 後端範圍 only：不含前端大螢幕動畫與手機通知 UI（另開計畫）。
- 不使用 Supabase Realtime（免費版 200 連線上限）。
- 合格條件固定為：`profiles.points >= events.raffle_threshold` 且 `profiles.role <> 'admin'`；已在本活動中獎者後續排除。
- 開獎 count：正整數，`1 <= count <= 100`。
- 輪詢端點快取：`Cache-Control: public, s-maxage=2, stale-while-revalidate=5`。
- 輪詢端點**禁止**輸出個人化內容或設 cookie（否則 CDN 失效）；只輸出全體中獎者 `userId + name + round`，「是不是我」由前端比對。
- 集中設定值（給後端與未來前端共用）：`s-maxage=2`、`SWR=5`、`POLL_INTERVAL_MS=3000`、`GATING_BUFFER_MINUTES=30`。
- SQL migration 跟隨既有慣例：檔名 `supabase/migrations/YYYYMMDD_description.sql`、用 `IF NOT EXISTS`、函式加 `SET search_path = public`。
- Migration 套用（`supabase db push` / `migration up`）屬高風險操作，**需先取得使用者確認**再執行；本計畫的「套用」步驟預設由使用者執行或明確同意後執行。
- 本專案目前**無自動化測試框架**；每個 Task 以「可執行的驗證指令（SQL / curl）+ 預期輸出」作為測試循環。
- 不自行 `git push`；commit 訊息需可追溯到 issue（待使用者提供票號）。

---

### Task 1: 資料表 `raffle_winners` 與 `events.raffle_active`

**Files:**
- Create: `supabase/migrations/20260624000001_create_raffle_winners.sql`
- Modify: `supabase/full_schema.sql`（補上同等定義，置於 events 區段之後）

**Interfaces:**
- Produces: 資料表 `public.raffle_winners(id, event_id, user_id, round, name, points, created_at)`，唯一鍵 `UNIQUE(event_id, user_id)`；欄位 `public.events.raffle_active boolean`。後續 Task 2/4 依賴這些名稱。

- [ ] **Step 1: 寫 migration 檔**

建立 `supabase/migrations/20260624000001_create_raffle_winners.sql`：

```sql
-- 抽獎中獎名單
CREATE TABLE IF NOT EXISTS public.raffle_winners (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   uuid NOT NULL REFERENCES public.events(id)   ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  round      int  NOT NULL,
  name       text,
  points     int,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)            -- 同活動不能中兩次
);

CREATE INDEX IF NOT EXISTS idx_raffle_winners_event_round
  ON public.raffle_winners (event_id, round);

ALTER TABLE public.raffle_winners ENABLE ROW LEVEL SECURITY;

-- 中獎名單本就公開於大螢幕：登入者可讀
DROP POLICY IF EXISTS "Authenticated can view raffle winners" ON public.raffle_winners;
CREATE POLICY "Authenticated can view raffle winners"
  ON public.raffle_winners FOR SELECT
  TO authenticated
  USING (true);

-- 寫入僅 admin（實際寫入走 draw_raffle SECURITY DEFINER，此政策防止直接竄改）
DROP POLICY IF EXISTS "Admins manage raffle winners" ON public.raffle_winners;
CREATE POLICY "Admins manage raffle winners"
  ON public.raffle_winners FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- 「目前哪場活動正在抽獎」的開關
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS raffle_active boolean NOT NULL DEFAULT false;
```

- [ ] **Step 2: 套用 migration（需使用者確認）**

請使用者執行（或在 session 用 `!` 前綴）：

Run: `supabase db push`
Expected: 顯示套用 `20260624000001_create_raffle_winners` 成功，無錯誤。

- [ ] **Step 3: 驗證表與欄位存在**

於 Supabase Studio SQL editor 執行：

```sql
SELECT column_name, data_type FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'raffle_winners'
ORDER BY ordinal_position;

SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'raffle_active';
```
Expected: 第一查詢列出 7 個欄位（id…created_at）；第二查詢回傳 1 列 `raffle_active`。

- [ ] **Step 4: 驗證唯一鍵生效**

```sql
-- 取任一 event 與任一 profile 試插兩次（請替換實際 uuid，第二次應失敗）
-- 第一次成功、第二次違反 UNIQUE(event_id, user_id) → 報錯即為正確
```
Expected: 第二次 INSERT 報 `duplicate key value violates unique constraint`。驗證後刪除測試列。

- [ ] **Step 5: 同步 `full_schema.sql`**

把上述表/索引/RLS/欄位定義補進 `supabase/full_schema.sql`（events 區段之後），保持單一真實來源。

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260624000001_create_raffle_winners.sql supabase/full_schema.sql
git commit -m "feat: add raffle_winners table and events.raffle_active"
```

---

### Task 2: 開獎函式 `draw_raffle(p_event_id, p_count)`

**Files:**
- Create: `supabase/migrations/20260624000002_create_draw_raffle_function.sql`
- Modify: `supabase/full_schema.sql`

**Interfaces:**
- Consumes: `public.raffle_winners`、`public.events.raffle_threshold`、`public.profiles(points, role, name)`、既有 `public.is_admin(uuid)`。
- Produces: `public.draw_raffle(p_event_id uuid, p_count int) RETURNS SETOF public.raffle_winners`。前端以 `supabase.rpc('draw_raffle', { p_event_id, p_count })` 呼叫。

- [ ] **Step 1: 寫 migration 檔**

建立 `supabase/migrations/20260624000002_create_draw_raffle_function.sql`：

```sql
CREATE OR REPLACE FUNCTION public.draw_raffle(p_event_id uuid, p_count int)
RETURNS SETOF public.raffle_winners
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_threshold int;
  v_round     int;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden: admin only';
  END IF;

  IF p_count IS NULL OR p_count < 1 OR p_count > 100 THEN
    RAISE EXCEPTION 'invalid count: must be between 1 and 100';
  END IF;

  SELECT COALESCE(raffle_threshold, 0) INTO v_threshold
  FROM public.events WHERE id = p_event_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'event not found';
  END IF;

  SELECT COALESCE(MAX(round), 0) + 1 INTO v_round
  FROM public.raffle_winners WHERE event_id = p_event_id;

  RETURN QUERY
  INSERT INTO public.raffle_winners (event_id, user_id, round, name, points)
  SELECT p_event_id, p.id, v_round, p.name, p.points
  FROM public.profiles p
  WHERE p.points >= v_threshold
    AND p.role <> 'admin'
    AND NOT EXISTS (
      SELECT 1 FROM public.raffle_winners w
      WHERE w.event_id = p_event_id AND w.user_id = p.id
    )
  ORDER BY random()
  LIMIT p_count
  RETURNING *;
END;
$$;

REVOKE ALL ON FUNCTION public.draw_raffle(uuid, int) FROM public;
REVOKE ALL ON FUNCTION public.draw_raffle(uuid, int) FROM anon;
GRANT EXECUTE ON FUNCTION public.draw_raffle(uuid, int) TO authenticated;
```

- [ ] **Step 2: 套用 migration（需使用者確認）**

Run: `supabase db push`
Expected: 套用 `20260624000002_create_draw_raffle_function` 成功。

- [ ] **Step 3: 驗證 — 非 admin 被擋**

於 SQL editor（不設定 jwt，`auth.uid()` 為 null → 非 admin）：

```sql
SELECT * FROM public.draw_raffle('00000000-0000-0000-0000-000000000000', 1);
```
Expected: 報錯 `forbidden: admin only`。

- [ ] **Step 4: 驗證 — admin 開獎、排除 admin/已中獎、count 上限**

於 SQL editor，先準備：一個真實活動 uuid（設好 `raffle_threshold`，例如 0 讓多數人合格）、一個 admin profile uuid。模擬 admin 身分後呼叫：

```sql
-- 模擬 admin 登入（auth.uid() 會讀 request.jwt.claims.sub）
SELECT set_config('request.jwt.claims', json_build_object('sub','<ADMIN_UUID>','role','authenticated')::text, true);

-- 第一輪抽 2 人
SELECT user_id, round, name FROM public.draw_raffle('<EVENT_UUID>', 2);
-- 第二輪抽 3 人（前一輪中獎者不應再出現）
SELECT user_id, round, name FROM public.draw_raffle('<EVENT_UUID>', 3);

-- 斷言：兩輪中獎者無交集、round 為 1 與 2、無任何 role='admin' 者
SELECT w.round, count(*) FROM public.raffle_winners w
WHERE w.event_id = '<EVENT_UUID>' GROUP BY w.round ORDER BY w.round;

SELECT count(*) AS admin_leak FROM public.raffle_winners w
JOIN public.profiles p ON p.id = w.user_id
WHERE w.event_id = '<EVENT_UUID>' AND p.role = 'admin';

-- count 上限
SELECT * FROM public.draw_raffle('<EVENT_UUID>', 101);
```
Expected: 第一/二輪 user 無交集；round 群組為 (1,2)；`admin_leak = 0`；最後一行報 `invalid count: must be between 1 and 100`。驗證後清掉測試資料：`DELETE FROM public.raffle_winners WHERE event_id = '<EVENT_UUID>';`

- [ ] **Step 5: 同步 `full_schema.sql`** — 將函式定義補入。

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260624000002_create_draw_raffle_function.sql supabase/full_schema.sql
git commit -m "feat: add draw_raffle rpc with admin guard and dedup"
```

---

### Task 3: 合格名單函式 `get_raffle_candidates(p_event_id)`

**Files:**
- Create: `supabase/migrations/20260624000003_create_get_raffle_candidates_function.sql`
- Modify: `supabase/full_schema.sql`

**Interfaces:**
- Consumes: `public.events.raffle_threshold`、`public.profiles(id, name, points, role)`、`public.is_admin`。
- Produces: `public.get_raffle_candidates(p_event_id uuid) RETURNS TABLE (id uuid, name text)`。大螢幕跑馬燈以 `supabase.rpc('get_raffle_candidates', { p_event_id })` 取名單。

- [ ] **Step 1: 寫 migration 檔**

建立 `supabase/migrations/20260624000003_create_get_raffle_candidates_function.sql`：

```sql
CREATE OR REPLACE FUNCTION public.get_raffle_candidates(p_event_id uuid)
RETURNS TABLE (id uuid, name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_threshold int;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden: admin only';
  END IF;

  SELECT COALESCE(raffle_threshold, 0) INTO v_threshold
  FROM public.events WHERE id = p_event_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'event not found';
  END IF;

  RETURN QUERY
  SELECT p.id, p.name
  FROM public.profiles p
  WHERE p.points >= v_threshold
    AND p.role <> 'admin';
END;
$$;

REVOKE ALL ON FUNCTION public.get_raffle_candidates(uuid) FROM public;
REVOKE ALL ON FUNCTION public.get_raffle_candidates(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_raffle_candidates(uuid) TO authenticated;
```

- [ ] **Step 2: 套用 migration（需使用者確認）**

Run: `supabase db push`
Expected: 套用成功。

- [ ] **Step 3: 驗證**

```sql
-- 非 admin 應被擋
SELECT * FROM public.get_raffle_candidates('<EVENT_UUID>');  -- 預期 forbidden

-- admin 身分：回傳的人數應等於 points>=門檻 且 role<>'admin' 的人數
SELECT set_config('request.jwt.claims', json_build_object('sub','<ADMIN_UUID>','role','authenticated')::text, true);
SELECT count(*) AS via_rpc FROM public.get_raffle_candidates('<EVENT_UUID>');
SELECT count(*) AS expected FROM public.profiles p
JOIN public.events e ON e.id = '<EVENT_UUID>'
WHERE p.points >= COALESCE(e.raffle_threshold,0) AND p.role <> 'admin';
```
Expected: 非 admin 報 `forbidden`；`via_rpc = expected`。

- [ ] **Step 4: 同步 `full_schema.sql`**

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260624000003_create_get_raffle_candidates_function.sql supabase/full_schema.sql
git commit -m "feat: add get_raffle_candidates rpc for marquee"
```

---

### Task 4: 集中設定值

**Files:**
- Create: `server/utils/raffle.ts`（Nitro 自動匯入，給輪詢端點用）
- Create: `app/config/raffle.ts`（前端共用常數，供未來大螢幕/手機 gating 使用）

**Interfaces:**
- Produces:
  - `server/utils/raffle.ts` 匯出 `RAFFLE_SMAXAGE_SECONDS = 2`、`RAFFLE_SWR_SECONDS = 5`。
  - `app/config/raffle.ts` 匯出 `POLL_INTERVAL_MS = 3000`、`GATING_BUFFER_MINUTES = 30`。

- [ ] **Step 1: 建 server 端常數**

建立 `server/utils/raffle.ts`：

```ts
// 輪詢端點的 CDN 快取秒數（與前端輪詢間隔搭配，最壞延遲約 5 秒）
export const RAFFLE_SMAXAGE_SECONDS = 2
export const RAFFLE_SWR_SECONDS = 5
```

- [ ] **Step 2: 建前端常數**

建立 `app/config/raffle.ts`：

```ts
// 手機輪詢間隔
export const POLL_INTERVAL_MS = 3000
// 雙層 gating 第一層：活動 start_at 前 / end_at 後的寬裕分鐘數，
// 落在此時間窗外則完全不輪詢（守住 Vercel 免費流量）。
export const GATING_BUFFER_MINUTES = 30
```

- [ ] **Step 3: 型別檢查**

Run: `pnpm typecheck`
Expected: 無新增錯誤。

- [ ] **Step 4: Commit**

```bash
git add server/utils/raffle.ts app/config/raffle.ts
git commit -m "chore: add centralized raffle config constants"
```

---

### Task 5: 輪詢端點 `/api/lottery/active`

**Files:**
- Create: `server/api/lottery/active.get.ts`
- Modify: `nuxt.config.ts`（加 `runtimeConfig` 私有金鑰）
- Modify: `.env.example`（補 `SUPABASE_SERVICE_ROLE_KEY`）

**Interfaces:**
- Consumes: `server/utils/raffle.ts` 的 `RAFFLE_SMAXAGE_SECONDS`、`RAFFLE_SWR_SECONDS`；env `SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY`；表 `events(raffle_active)`、`raffle_winners`。
- Produces: GET `/api/lottery/active` 回傳
  `{ active: false } | { active: true, eventId: string, round: number, winners: { userId: string, name: string|null, round: number }[] }`，
  並帶 `Cache-Control: public, s-maxage=2, stale-while-revalidate=5`。

- [ ] **Step 1: 加 runtimeConfig（server 私有）**

於 `nuxt.config.ts` 的 `defineNuxtConfig({ ... })` 內新增頂層 key（與 `supabase:` 同層）：

```ts
  runtimeConfig: {
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
```

- [ ] **Step 2: 補 `.env.example`**

於 `.env.example` 追加一行（值留空，僅作文件）：

```env
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

並提醒：本機 `.env` 與 Vercel 專案環境變數都要實際填入此金鑰（此 key 僅在 server 端使用，不會外洩到瀏覽器）。

- [ ] **Step 3: 寫 server route**

建立 `server/api/lottery/active.get.ts`：

```ts
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  // 先設快取標頭：對所有人回應一致，才能被 Vercel CDN 快取
  setHeader(
    event,
    'Cache-Control',
    `public, s-maxage=${RAFFLE_SMAXAGE_SECONDS}, stale-while-revalidate=${RAFFLE_SWR_SECONDS}`,
  )

  const config = useRuntimeConfig()
  // service-role、不持久化 session、不帶 cookie → 回應非個人化、可快取
  const supabase = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: activeEvent, error: evErr } = await supabase
    .from('events')
    .select('id')
    .eq('raffle_active', true)
    .limit(1)
    .maybeSingle()

  if (evErr) throw createError({ statusCode: 500, statusMessage: 'event lookup failed' })
  if (!activeEvent) return { active: false as const }

  const { data: winners, error: wErr } = await supabase
    .from('raffle_winners')
    .select('user_id, name, round')
    .eq('event_id', activeEvent.id)
    .order('round', { ascending: true })

  if (wErr) throw createError({ statusCode: 500, statusMessage: 'winners lookup failed' })

  const rows = winners ?? []
  const latestRound = rows.reduce((m, w) => Math.max(m, w.round), 0)

  return {
    active: true as const,
    eventId: activeEvent.id,
    round: latestRound,
    winners: rows.map(w => ({ userId: w.user_id, name: w.name, round: w.round })),
  }
})
```

- [ ] **Step 4: 啟動 dev server**

Run: `pnpm dev`
Expected: Nuxt 啟動於 `http://localhost:3000`，無編譯錯誤。

- [ ] **Step 5: 驗證 — 無進行中抽獎**

確保所有 `events.raffle_active = false`，然後：

Run: `curl -i http://localhost:3000/api/lottery/active`
Expected: HTTP 200；header 含 `Cache-Control: public, s-maxage=2, stale-while-revalidate=5`；body 為 `{"active":false}`。

- [ ] **Step 6: 驗證 — 有進行中抽獎 + 已開獎**

於 SQL editor：把某活動設 `raffle_active = true`，並用 Task 2 的 `draw_raffle` 抽幾人。然後：

Run: `curl -s http://localhost:3000/api/lottery/active`
Expected: body 為 `{"active":true,"eventId":"...","round":N,"winners":[{"userId":"...","name":"...","round":N}, ...]}`，winners 筆數等於該活動 `raffle_winners` 筆數。驗證後把 `raffle_active` 改回 false 並清測試資料。

- [ ] **Step 7: 型別檢查**

Run: `pnpm typecheck`
Expected: 無新增錯誤。

- [ ] **Step 8: Commit**

```bash
git add server/api/lottery/active.get.ts nuxt.config.ts .env.example
git commit -m "feat: add cacheable /api/lottery/active polling endpoint"
```

---

### Task 6: 文件更新

**Files:**
- Modify: `docs/PROJECT_GUIDE.md`
- Modify: `README.md`

**Interfaces:**
- Consumes: 前述所有產出（表、兩支 RPC、端點、env）。
- Produces: 無程式介面，僅文件。

- [ ] **Step 1: 更新 PROJECT_GUIDE.md**

於「功能現況」新增抽獎段落、於「資料模型重點」加入 `raffle_winners` 與 `events.raffle_active`、於 Edge/Server 段落記錄：
- 兩支 RPC `draw_raffle` / `get_raffle_candidates`（admin only、合格條件、count 1~100、同活動去重）。
- Nitro 端點 `/api/lottery/active`（service-role 讀取、`s-maxage=2` 快取、回傳全體中獎名單由前端比對）。
- 雙層 gating 概念（前端時間窗 + `raffle_active` 開關）與所需環境變數 `SUPABASE_SERVICE_ROLE_KEY`（Vercel 也需設定）。

- [ ] **Step 2: 更新 README.md**

於「Edge Functions 環境變數」或新增「Server 環境變數」段落，補上 Nitro 端點需要的 `SUPABASE_SERVICE_ROLE_KEY`（本機 `.env` + Vercel 皆需）。更新「更新日期」為 2026-06-24。

- [ ] **Step 3: Commit**

```bash
git add docs/PROJECT_GUIDE.md README.md
git commit -m "docs: document raffle backend (rpc, polling endpoint, env)"
```

---

## Self-Review

**Spec coverage:**
- §3.1 raffle_winners 表 → Task 1 ✓
- §3.2 events.raffle_active → Task 1 ✓
- §4 draw_raffle RPC（admin 驗證、count 1~100、排除 admin/已中獎、round 遞增）→ Task 2 ✓
- §4.1 get_raffle_candidates → Task 3 ✓
- §5 /api/lottery/active + 快取標頭 + service-role 非個人化 → Task 5 ✓
- §6 雙層 gating：第二層 `raffle_active` 後端開關 → Task 1（欄位）+ Task 5（端點讀取）✓；第一層前端時間窗 buffer 為前端範圍，本計畫僅以 `app/config/raffle.ts`（Task 4）提供常數，實作於後續前端計畫。
- §8 交付清單 1–6 → Task 1–6 ✓
- §9 排除項：本計畫未納入背景推播、未中獎顯示、前端 UI、報名/簽到條件、advisory lock，與 spec 一致 ✓

**Placeholder scan:** 無 TBD/TODO；所有 SQL/TS/驗證指令均為實際內容（`<EVENT_UUID>`/`<ADMIN_UUID>` 為驗證時必填的真實值佔位，已標明）。

**Type consistency:** `draw_raffle(p_event_id uuid, p_count int)`、`get_raffle_candidates(p_event_id uuid)`、端點回傳 `winners[].userId/name/round`、常數 `RAFFLE_SMAXAGE_SECONDS`/`RAFFLE_SWR_SECONDS`/`POLL_INTERVAL_MS`/`GATING_BUFFER_MINUTES` 在跨 Task 引用一致。

**已知限制（與 spec §7 一致）：** 無自動化測試框架，故以 SQL/curl 驗證取代單元測試；多人同時開獎的 round 撞號未處理（單一主持人風險極低）。
