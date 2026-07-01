-- 抽獎獎項設定：活動層級保存第幾獎 / 獎項名稱 / 中獎人數
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS raffle_prizes JSONB NOT NULL DEFAULT '[]'::jsonb;

-- 更新手機輪詢函式，將獎項名稱一併帶回前端
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
            SELECT BTRIM(COALESCE(elem ->> 'name', ''))
            FROM jsonb_array_elements(COALESCE(v_prizes, '[]'::jsonb)) WITH ORDINALITY AS prize(elem, ord)
            WHERE COALESCE(NULLIF((elem ->> 'order')::int, 0), ord::int) = w.round
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
