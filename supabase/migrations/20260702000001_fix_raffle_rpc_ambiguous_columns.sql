-- Qualify column references inside raffle RPCs so PL/pgSQL output variables
-- and table columns with the same names do not become ambiguous.

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

  SELECT COALESCE(e.raffle_threshold, 0) INTO v_threshold
  FROM public.events e
  WHERE e.id = p_event_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'event not found';
  END IF;

  SELECT COALESCE(MAX(w.round), 0) + 1 INTO v_round
  FROM public.raffle_winners w
  WHERE w.event_id = p_event_id;

  RETURN QUERY
  INSERT INTO public.raffle_winners AS rw (event_id, user_id, round, name, points)
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
  RETURNING rw.*;
END;
$$;
REVOKE ALL ON FUNCTION public.draw_raffle(uuid, int) FROM public;
REVOKE ALL ON FUNCTION public.draw_raffle(uuid, int) FROM anon;
GRANT EXECUTE ON FUNCTION public.draw_raffle(uuid, int) TO authenticated;
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

  SELECT COALESCE(e.raffle_threshold, 0) INTO v_threshold
  FROM public.events e
  WHERE e.id = p_event_id;
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
  SELECT e.id INTO v_event_id
  FROM public.events e
  WHERE e.raffle_active = true
  LIMIT 1;

  IF v_event_id IS NULL THEN
    RETURN jsonb_build_object('active', false);
  END IF;

  SELECT COALESCE(e.raffle_prizes, '[]'::jsonb)
  INTO v_prizes
  FROM public.events e
  WHERE e.id = v_event_id;

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
