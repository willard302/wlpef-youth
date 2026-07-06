-- 為 raffle_winners 加入 revealed_at 欄位，解決「動畫未結束手機卻已彈中獎通知」的問題。
--
-- 流程：
--   draw_raffle 寫入時 revealed_at 預設為 NULL（對輪詢隱藏）；
--   管理員大螢幕動畫結束後，前端呼叫 revealRound → UPDATE revealed_at = NOW()；
--   get_active_raffle 只回傳 revealed_at IS NOT NULL 的中獎者，
--   確保手機通知永遠在大螢幕公布後才出現。

ALTER TABLE public.raffle_winners
  ADD COLUMN IF NOT EXISTS revealed_at timestamptz;

-- 既有資料視為已公開（以 created_at 作為 revealed_at，不破壞現況）
UPDATE public.raffle_winners
  SET revealed_at = created_at
  WHERE revealed_at IS NULL;

-- 更新 get_active_raffle：僅回傳 revealed_at IS NOT NULL 的中獎者
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
          'name',   w.name,
          'round',  w.round,
          'prize',  NULLIF((
            SELECT BTRIM(COALESCE(p.elem ->> 'name', ''))
            FROM (
              SELECT
                elem,
                ROW_NUMBER() OVER (
                  ORDER BY
                    COALESCE(
                      NULLIF((elem ->> 'drawOrder')::int, 0),
                      NULLIF((elem ->> 'order')::int, 0),
                      ord::int
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
  WHERE w.event_id = v_event_id
    AND w.revealed_at IS NOT NULL;  -- 只回傳已公開的輪次

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
