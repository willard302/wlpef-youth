-- F3（方式 A）：修正 get_active_raffle 的「輪次 → 獎項」對應。
-- 背景：raffle_prizes 的 JSON 形狀已由 { order, name, count } 改為
--       { prize, name, count, drawOrder }（前端 types/raffle.ts、raffleAdmin.updateRafflePrizes）。
--       舊函式仍讀 elem->>'order'，新資料抓不到只能退化成陣列原始位置，語意與前端不符。
-- 修正：改為「依 drawOrder 排序後的位置（1-based）對應 round」，與前端
--       normalizeRafflePrizeSettings() + getRafflePrizeSettingByRound()（取排序後第 round 個）一致。
--       仍保留 legacy 'order' 作為次要 fallback，避免舊資料排序錯亂。
CREATE OR REPLACE FUNCTION public.get_active_raffle()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id uuid;
  v_round    int;
  v_winners  jsonb;
  v_prizes   jsonb;
BEGIN
  SELECT id INTO v_event_id
  FROM public.events
  WHERE raffle_active = true
  LIMIT 1;

  IF v_event_id IS NULL THEN
    RETURN jsonb_build_object('active', false);
  END IF;

  SELECT COALESCE(raffle_prizes, '[]'::jsonb)
  INTO v_prizes
  FROM public.events
  WHERE id = v_event_id;

  SELECT
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'userId', w.user_id,
          'name', w.name,
          'round', w.round,
          'prize', NULLIF((
            SELECT BTRIM(COALESCE(p.elem ->> 'name', ''))
            FROM (
              SELECT
                elem,
                ROW_NUMBER() OVER (
                  ORDER BY
                    COALESCE(
                      NULLIF((elem ->> 'drawOrder')::int, 0),  -- 現行主鍵
                      NULLIF((elem ->> 'order')::int, 0),      -- legacy fallback
                      ord::int                                 -- 最終以原始位置
                    ),
                    ord
                ) AS pos
              FROM jsonb_array_elements(COALESCE(v_prizes, '[]'::jsonb)) WITH ORDINALITY AS t(elem, ord)
            ) p
            WHERE p.pos = w.round
            LIMIT 1
          ), '')
        )
        ORDER BY w.round
      ),
      '[]'::jsonb
    ),
    COALESCE(MAX(w.round), 0)
  INTO v_winners, v_round
  FROM public.raffle_winners w
  WHERE w.event_id = v_event_id;

  RETURN jsonb_build_object(
    'active',  true,
    'eventId', v_event_id,
    'round',   v_round,
    'winners', v_winners
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_active_raffle() FROM public;
GRANT EXECUTE ON FUNCTION public.get_active_raffle() TO anon, authenticated;
