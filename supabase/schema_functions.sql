-- ============================================================
-- WLPEF Youth - Functions, Triggers & RPC Definitions
-- ============================================================

-- 1. Identity & Role Verification Functions
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = user_id
      AND p.role = 'admin'
  );
$$;

-- Fix policies in tables that use is_admin function (Ensuring robust reference)
CREATE OR REPLACE POLICY "Users can view published events, own events, or admin events"
  ON public.events FOR SELECT
  USING (status = 'published' OR created_by = auth.uid() OR public.is_admin(auth.uid()));

CREATE OR REPLACE POLICY "Admins and creators can update events"
  ON public.events FOR UPDATE
  USING (created_by = auth.uid() OR public.is_admin(auth.uid()))
  WITH CHECK (created_by = auth.uid() OR public.is_admin(auth.uid()));

CREATE OR REPLACE POLICY "Admins and creators can delete events"
  ON public.events FOR DELETE
  USING (created_by = auth.uid() OR public.is_admin(auth.uid()));

CREATE OR REPLACE POLICY "Admins can view all registrations"
  ON public.event_registrations FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE OR REPLACE POLICY "Admins can view all checkins"
  ON public.checkin_records FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE OR REPLACE POLICY "Admins can view all transactions"
  ON public.point_transactions FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE OR REPLACE POLICY "Admins manage raffle winners"
  ON public.raffle_winners FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));


-- 2. Trigger Functions
-- Trigger for updated_at
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_profiles_updated_at ON public.profiles;
CREATE TRIGGER tr_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Function to handle new user creation from auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1), 'User'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'member')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(profiles.name, EXCLUDED.name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to sync text array of participants on registration change
CREATE OR REPLACE FUNCTION public.sync_event_participants_from_registrations()
RETURNS TRIGGER AS $$
DECLARE
  target_event_id UUID;
BEGIN
  target_event_id := COALESCE(NEW.event_id, OLD.event_id);

  IF target_event_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  UPDATE public.events e
  SET participants = (
    SELECT COALESCE(array_agg(DISTINCT lower(trim(er.email))), ARRAY[]::TEXT[])
    FROM public.event_registrations er
    WHERE er.event_id = target_event_id
      AND er.email IS NOT NULL
      AND trim(er.email) <> ''
  )
  WHERE e.id = target_event_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_sync_event_participants_from_registrations ON public.event_registrations;
CREATE TRIGGER tr_sync_event_participants_from_registrations
  AFTER INSERT OR UPDATE OR DELETE ON public.event_registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_event_participants_from_registrations();


-- 3. Point Granting Logic (Unified & Batch Processing)
CREATE OR REPLACE FUNCTION public.process_pending_points()
RETURNS void AS $$
DECLARE
  r RECORD;
BEGIN
  -- 1. Process Registration Points
  FOR r IN 
    SELECT 
      er.id as registration_id,
      er.matched_user_id as user_id,
      er.event_id,
      e.title as event_title,
      e.registration_bonus as points
    FROM public.event_registrations er
    JOIN public.events e ON er.event_id = e.id
    WHERE er.registration_points_granted_at IS NULL
      AND er.matched_user_id IS NOT NULL
      AND e.registration_bonus > 0
  LOOP
    -- Insert transaction
    INSERT INTO public.point_transactions (user_id, event_id, registration_id, points, type, description)
    VALUES (r.user_id, r.event_id, r.registration_id, r.points, 'registration', '報名活動獎勵: ' || r.event_title);

    -- Update profile
    UPDATE public.profiles SET points = COALESCE(points, 0) + r.points WHERE id = r.user_id;

    -- Mark granted
    UPDATE public.event_registrations SET registration_points_granted_at = NOW() WHERE id = r.registration_id;
  END LOOP;

  -- 2. Process Check-in Points
  FOR r IN 
    SELECT 
      cr.id as checkin_id,
      cr.user_id,
      cr.event_id,
      e.title as event_title,
      e.checkin_bonus as points
    FROM public.checkin_records cr
    JOIN public.events e ON cr.event_id = e.id
    WHERE cr.checkin_points_granted_at IS NULL
      AND cr.user_id IS NOT NULL
      AND e.checkin_bonus > 0
  LOOP
    -- Insert transaction
    INSERT INTO public.point_transactions (user_id, event_id, checkin_id, points, type, description)
    VALUES (r.user_id, r.event_id, r.checkin_id, r.points, 'checkin', '活動簽到獎勵: ' || r.event_title);

    -- Update profile
    UPDATE public.profiles SET points = COALESCE(points, 0) + r.points WHERE id = r.user_id;

    -- Mark granted
    UPDATE public.checkin_records SET checkin_points_granted_at = NOW() WHERE id = r.checkin_id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Compatibility wrapper for the old RPC name
CREATE OR REPLACE FUNCTION public.process_event_registration_points(reg_id UUID DEFAULT NULL)
RETURNS void AS $$
BEGIN
  PERFORM public.process_pending_points();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. Scheduled Google Sheet Sync (HTTP Net Cron)
CREATE OR REPLACE FUNCTION public.trigger_google_sheet_sync()
RETURNS void AS $$
DECLARE
  project_url TEXT;
  service_role_key TEXT;
BEGIN
  SELECT decrypted_secret
    INTO project_url
    FROM vault.decrypted_secrets
   WHERE name = 'supabase_project_url'
   LIMIT 1;

  SELECT decrypted_secret
    INTO service_role_key
    FROM vault.decrypted_secrets
   WHERE name = 'supabase_service_role_key'
   LIMIT 1;

  IF project_url IS NULL OR service_role_key IS NULL THEN
    RAISE WARNING 'Missing Supabase Vault secrets for Google Sheet sync cron';
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := project_url || '/functions/v1/sync-google-sheet',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key
    ),
    body := jsonb_build_object(
      'mode', 'recent',
      'recentPastDays', 0,
      'recentFutureDays', 30
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cron Scheduling Definition
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-google-sheet-every-minute') THEN
    PERFORM cron.unschedule('sync-google-sheet-every-minute');
  END IF;

  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-google-sheet-recent-hourly') THEN
    PERFORM cron.unschedule('sync-google-sheet-recent-hourly');
  END IF;

  PERFORM cron.schedule(
    'sync-google-sheet-recent-minute',
    '* * * * *',
    'SELECT public.trigger_google_sheet_sync();'
  );
END $$;


-- 5. Raffle Core Functions (RPC Endpoints)
-- 開獎函式：admin only
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

-- 合格名單函式（大螢幕跑馬燈用，純讀取）
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

-- 手機輪詢用：回傳目前 raffle_active 活動的中獎名單
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