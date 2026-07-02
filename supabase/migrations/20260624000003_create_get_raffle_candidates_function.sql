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
