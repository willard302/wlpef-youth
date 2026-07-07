-- Add raffle_staff role capabilities:
-- 1) Can use scanner flow
-- 2) Can manage raffle setup/draw without full admin privileges

BEGIN;

CREATE OR REPLACE FUNCTION public.can_manage_raffle(user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = user_id
      AND p.role IN ('admin', 'raffle_staff')
  );
$$;

GRANT EXECUTE ON FUNCTION public.can_manage_raffle(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.can_scan_checkin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = user_id
      AND p.role IN ('admin', 'staff', 'raffle_staff')
  );
$$;

GRANT EXECUTE ON FUNCTION public.can_scan_checkin(UUID) TO authenticated;

DROP POLICY IF EXISTS "Admins manage raffle winners" ON public.raffle_winners;
CREATE POLICY "Admins manage raffle winners"
  ON public.raffle_winners FOR ALL
  TO authenticated
  USING (public.can_manage_raffle(auth.uid()))
  WITH CHECK (public.can_manage_raffle(auth.uid()));

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
  IF NOT public.can_manage_raffle(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden: raffle manager only';
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
  IF NOT public.can_manage_raffle(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden: raffle manager only';
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

CREATE OR REPLACE FUNCTION public.set_raffle_prizes(p_event_id uuid, p_prizes jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prizes jsonb;
BEGIN
  IF NOT public.can_manage_raffle(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden: raffle manager only';
  END IF;

  UPDATE public.events e
  SET raffle_prizes = COALESCE(p_prizes, '[]'::jsonb)
  WHERE e.id = p_event_id
  RETURNING COALESCE(e.raffle_prizes, '[]'::jsonb) INTO v_prizes;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'event not found';
  END IF;

  RETURN v_prizes;
END;
$$;

REVOKE ALL ON FUNCTION public.set_raffle_prizes(uuid, jsonb) FROM public;
REVOKE ALL ON FUNCTION public.set_raffle_prizes(uuid, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.set_raffle_prizes(uuid, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_raffle_active(p_event_id uuid, p_active boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.can_manage_raffle(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden: raffle manager only';
  END IF;

  IF p_active THEN
    UPDATE public.events e
    SET raffle_active = false
    WHERE e.raffle_active = true
      AND e.id <> p_event_id;
  END IF;

  UPDATE public.events e
  SET raffle_active = p_active
  WHERE e.id = p_event_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'event not found';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.set_raffle_active(uuid, boolean) FROM public;
REVOKE ALL ON FUNCTION public.set_raffle_active(uuid, boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.set_raffle_active(uuid, boolean) TO authenticated;

COMMIT;
