# 抽獎機制測試 Runbook

涵蓋三部分：**A. UI 完整流程**（前端＋後端，推薦）、**B. 後端資料管線驗證**（Studio + curl，純後端）、**C. 重置與清理**。
功能全貌見 `docs/raffle-feature.md`。

---

## A. UI 完整測試流程（推薦）

### 前置

1. **把站台跑起來**（二選一）：
   - 本機：`pnpm dev` → `http://localhost:3000`（手機測：`pnpm dev --host` + 區網 IP）
   - 線上：push 到 GitHub 讓 Vercel 部署 → `https://<app>.vercel.app`
   - 確認 `.env`（或 Vercel env）`SUPABASE_URL`/`SUPABASE_KEY` 指向要測的專案。
2. **兩個帳號**：一個 `admin`、一個一般 user（例 `test0531@example.com`），各開一個視窗/裝置登入。
3. **讓 user 有資格中獎**：合格條件是 `points >= 活動門檻`。新帳號 points=0，最簡單就是把要抽的活動**門檻設 0**：
   ```sql
   UPDATE public.events SET raffle_threshold = 0 WHERE id = '<EVENT_UUID>';
   ```

### A1. admin 開獎（後台控制台）

1. admin 登入 → 管理首頁 → **抽獎控制**（`/admin/raffle`）
2. 選那場活動 → 確認「合格人數」≥ 1（含測試 user）
3. 按 **開始抽獎**（系統自動關掉其他場）。若現在不在活動時間窗會跳警告——測試時可選「仍要開始」，但這樣只有 `/raffle-test` 看得到（見 D 注意事項）。
4. 用 `+ / −` 設「每輪抽幾位」→ 按 **套用**（草稿值才生效）→ 按 **抽這一輪**（真正開獎；多按幾次＝多輪，提高測試 user 被抽中機率）

### A2. user 看顯示效果（兩種看法）

| 方式 | 怎麼開 | 條件 |
|---|---|---|
| **測試頁（最簡單，隨時可測）** | 開 `/raffle-test` | 無 gating，必定輪詢；顯示我的 id / 目前輪次 / 是否中獎 / 原始回應，中獎跳窗 |
| **正式全域體驗** | 停在**任何會員頁**（首頁等） | 需「現在」落在該活動 `[start−30分, end+30分]` 時間窗內，否則第一層 gating 會擋住不輪詢 |

→ 測試 user 被抽中後，**約 5 秒內**跳「🎉 恭喜中獎」，且**同一輪只跳一次**（重整也不重複）。

### A3.（選用）指定某帳號「必中」做畫面驗證

不靠隨機，直接讓指定帳號中獎（前提：已有一場 `raffle_active=true`、該帳號開著 `/raffle-test` 或會員頁）：
```sql
INSERT INTO public.raffle_winners (event_id, user_id, round, name, points)
SELECT e.id, p.id, 1, p.name, p.points
FROM public.events e, public.profiles p
WHERE e.raffle_active = true AND p.email = 'test0531@example.com'
ON CONFLICT (event_id, user_id) DO NOTHING;
```

### A 觀察重點

| 觀察 | 代表 |
|---|---|
| 控制台「合格人數」正確 | `get_raffle_candidates` 正確 |
| 抽 N 位就出現 N 位、round 累加 | `draw_raffle` + 設定值正確 |
| 第二輪不重複中獎 | 去重正確 |
| 中獎者裡沒有 admin | 排除主辦正確 |
| user 中獎 ~5 秒跳窗、重整不重跳 | 前端比對 + 只通知一次正確 |
| 撤回本輪後該輪消失 | 撤回正確 |

---

## B. 後端資料管線驗證（Studio + curl，純後端）

不經前端，直接驗「開獎 → 端點取得中獎名單」。手機端 = 瀏覽器或 curl 打 `/api/lottery/active`。

### ① 基準
開 `http://localhost:3000/api/lottery/active` → `{ "active": false }`

### ② 建測試活動並開始抽獎（門檻 0 讓所有 member 合格）
```sql
UPDATE public.events SET raffle_active = false WHERE raffle_active = true;
INSERT INTO public.events (title, start_at, end_at, status, raffle_threshold, raffle_active)
VALUES ('__selftest__', now(), now() + interval '2 hours', 'published', 0, true);
```

### ③ 端點重整 → `{ "active": true, "eventId": "...", "round": 0, "winners": [] }`

### ④ 開獎抽 2 人（模擬 admin，兩行一起執行）
```sql
SELECT set_config('request.jwt.claims',
  json_build_object('sub',(SELECT id FROM public.profiles WHERE role='admin' LIMIT 1),'role','authenticated')::text, true);
SELECT user_id, round, name
FROM public.draw_raffle((SELECT id FROM public.events WHERE title='__selftest__' ORDER BY created_at DESC LIMIT 1), 2);
```

### ⑤ 端點重整 → winners 出現（`round: 1`、2 位）

### ⑥ 「是不是我」：拿任一中獎者 `userId` 對 `profiles.id`，對得上 → 那人手機會跳中獎

### ⑦ 多輪：再跑 ④（改抽 3 人）→ `round: 2`、新中獎者、前一輪不重複

### ⑧ 結束抽獎
```sql
UPDATE public.events SET raffle_active = false WHERE title = '__selftest__';
```

### B 觀察重點

| 觀察 | 代表 |
|---|---|
| ③ winners 空、⑤ 開獎後出現 | 開獎 → 端點同步 OK |
| ⑦ 第二輪不重複中獎 | 去重正確 |
| 中獎者裡沒有 admin | 排除主辦正確 |
| Response header 有 `Cache-Control: s-maxage=2, ...` | CDN 快取會生效（真正快取要 Vercel，看 `x-vercel-cache: HIT`） |
| ④ 不先 `set_config` 直接 draw → 報 `forbidden` | 權限防護正確 |

---

## C. 重置與清理

### C1. 通知重置（localStorage）— 想對「同帳號同一輪」重看彈窗

瀏覽器 Console（F12）貼這行，只清抽獎通知記錄、不動登入狀態，再重整：
```js
Object.keys(localStorage).filter(k => k.startsWith('raffle:notified:')).forEach(k => localStorage.removeItem(k))
```
> 不要用 `localStorage.clear()`（會清掉 Supabase 登入 session）。手機不便開 Console 就用無痕視窗、或抽新一輪。

### C2. 測試資料清理（DB）

Supabase Studio SQL Editor（測試專案，安全）：
```sql
-- 1) 關掉所有進行中的抽獎
UPDATE public.events SET raffle_active = false WHERE raffle_active = true;

-- 2) 刪掉測試用活動（cascade 一併清掉該活動中獎名單）
DELETE FROM public.events WHERE title = '__selftest__';

-- 3) 清掉測試假名的中獎資料
DELETE FROM public.raffle_winners WHERE name = '測試王小明';
```
其他選項：
```sql
-- 清某活動的全部中獎名單（保留活動）
DELETE FROM public.raffle_winners WHERE event_id = '<EVENT_UUID>';
-- 或整張清空（測試專案才這樣做）
DELETE FROM public.raffle_winners;
```
查殘留：
```sql
SELECT event_id, round, name, created_at FROM public.raffle_winners ORDER BY created_at DESC;
SELECT id, title, raffle_active FROM public.events WHERE raffle_active = true OR title = '__selftest__';
```
> 也可改用後台 UI：`/admin/raffle` 選活動 → 每輪「撤回本輪」→「結束抽獎」（但 SQL 建的 `__selftest__` 活動要從清單消失仍需 `DELETE FROM events`）。

---

## D. 注意事項

- **延遲**：本機即時；上 Vercel 後 `s-maxage=2` + 輪詢 3 秒，最壞約 5 秒內跳出（設計值）。
- **僅 App 內提示**：鎖屏 / 切背景會暫停輪詢，重開才補看到（未做背景推播）。
- **gating**：正式全域通知只在活動時間窗內輪詢；要測「全域」就讓活動時間涵蓋現在，或直接用 `/raffle-test`（無 gating）。
- **`draw_raffle` 回 0 筆**：代表沒有合格 member（`points ≥ 門檻` 且非 admin），降低門檻或塞測試 member。
- **CDN 命中率 / 免費額度**：需 Vercel 環境，對端點連打觀察 `x-vercel-cache: HIT`（見測試計畫 L4）。
