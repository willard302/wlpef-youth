-- 手機輪詢用：回傳目前 raffle_active 活動的中獎名單（只吐公開欄位）。
-- SECURITY DEFINER 內部繞過 RLS，並只 GRANT 給 anon/authenticated，
-- 讓 Nitro 端點可用「公開安全的 anon key」呼叫，無需 service role key。
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
BEGIN
  SELECT id INTO v_event_id
  FROM public.events
  WHERE raffle_active = true
  LIMIT 1;

  IF v_event_id IS NULL THEN
    RETURN jsonb_build_object('active', false);
  END IF;

  SELECT
    COALESCE(
      jsonb_agg(
        jsonb_build_object('userId', w.user_id, 'name', w.name, 'round', w.round)
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
