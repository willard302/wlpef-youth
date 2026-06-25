# 抽獎機制自我驗證 Runbook（後端）

在前端 UI 完成前，可用此 runbook 手動跑完整流程，驗證「開獎 → 手機端取得中獎名單」的後端資料管線。

概念：兩個角色

- **主辦 / 大螢幕端** = Supabase Studio SQL Editor（設定開關、開獎）
- **手機端** = 瀏覽器或 curl 打 `/api/lottery/active`（模擬手機輪詢）

## 準備：把手機端跑起來

```bash
pnpm dev
```

手機端網址（瀏覽器開、重新整理即可，或 curl）：
`http://localhost:3000/api/lottery/active`

> 用真手機測：`pnpm dev --host`，手機連 `http://<電腦區網IP>:3000/api/lottery/active`。
> 注意本機 `.env` 的 `SUPABASE_URL`/`SUPABASE_KEY` 要指向你要測的專案。

## 一輪完整驗證（依序）

### ① 手機端（基準）
開網址，應看到：
```json
{ "active": false }
```

### ② 主辦端（Studio）：建測試活動並「開始抽獎」
門檻設 0 讓所有 member 都合格；先確保只有一場在抽。
```sql
UPDATE public.events SET raffle_active = false WHERE raffle_active = true;
INSERT INTO public.events (title, start_at, end_at, status, raffle_threshold, raffle_active)
VALUES ('__selftest__', now(), now() + interval '2 hours', 'published', 0, true);
```

### ③ 手機端：重新整理（還沒開獎、winners 空）
```json
{ "active": true, "eventId": "...", "round": 0, "winners": [] }
```

### ④ 主辦端（Studio）：開獎抽 2 人（模擬 admin，兩行一起執行）
```sql
SELECT set_config('request.jwt.claims',
  json_build_object('sub',(SELECT id FROM public.profiles WHERE role='admin' LIMIT 1),'role','authenticated')::text, true);
SELECT user_id, round, name
FROM public.draw_raffle((SELECT id FROM public.events WHERE title='__selftest__' ORDER BY created_at DESC LIMIT 1), 2);
```
→ 列出 2 位中獎者。

### ⑤ 手機端：重新整理，winners 出現
```json
{ "active": true, "round": 1, "winners": [ {"userId":"...","name":"...","round":1}, ... ] }
```
✅ 核心機制：開獎後，手機端那份 JSON 就帶出中獎名單。

### ⑥ 驗證「是不是我」
前端邏輯＝「比對登入者 id 是否在 winners 裡」。拿任一中獎者的 `userId` 去對 `profiles.id`，對得上 → 那人手機就會跳中獎。

### ⑦ 多輪
再跑一次 ④（改抽 3 人），手機端會看到 `round: 2`、新中獎者，且前一輪的人**不重複**。

### ⑧ 結束抽獎
```sql
UPDATE public.events SET raffle_active = false WHERE title = '__selftest__';
```
手機端重新整理 → 回到 `{ "active": false }`。

### ⑨ 清理（移除測試活動，cascade 清掉中獎資料）
```sql
DELETE FROM public.events WHERE title = '__selftest__';
```

## 觀察重點檢查表

| 觀察 | 代表 |
|---|---|
| ③ winners 空、⑤ 開獎後出現 | 開獎 → 手機同步 OK |
| ⑦ 第二輪不重複中獎 | 去重正確 |
| 中獎者裡沒有 admin | 排除主辦正確 |
| Response header 有 `Cache-Control: s-maxage=2, ...` | CDN 快取會生效（本機看得到 header，真正快取要 Vercel） |
| ④ 不先 `set_config` 直接 draw → 報 `forbidden` | 權限防護正確 |

## 注意

- **延遲體感**：本機即時；上 Vercel 後因 `s-maxage=2` + 前端每 3 秒輪詢，最壞約 5 秒內跳出（設計值）。
- **完整「自動跳通知」體驗**要等前端（自動輪詢 + 比對 + 彈窗）；本 runbook 驗證的是後端資料管線。
- 若 `draw_raffle` 回傳 0 筆：代表測試 DB 沒有合格 member（points≥門檻且非 admin），先塞幾筆 member 再測。
- **CDN 命中率 / 免費額度**：需部署 Vercel 後，對端點連打觀察 `x-vercel-cache: HIT` 與 Supabase/Vercel 用量（見測試計畫 L4）。
