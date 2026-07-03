-- Base schema required before later ALTER migrations run in a clean local DB.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT DEFAULT 'member',
  scan_permission BOOLEAN DEFAULT FALSE,
  email TEXT,
  points INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  location TEXT DEFAULT '',
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  all_day BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'draft',
  google_sheet_id TEXT,
  google_form_url TEXT,
  registration_bonus INTEGER DEFAULT 0,
  checkin_bonus INTEGER DEFAULT 0,
  raffle_threshold INTEGER DEFAULT 0,
  raffle_prizes JSONB DEFAULT '[]'::jsonb,
  participants TEXT[],
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  raffle_active BOOLEAN NOT NULL DEFAULT false
);
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'events_status_check'
      AND conrelid = 'public.events'::regclass
  ) THEN
    ALTER TABLE public.events
      ADD CONSTRAINT events_status_check
      CHECK (status IN ('draft', 'published', 'closed'));
  END IF;
END $$;
CREATE TABLE IF NOT EXISTS public.event_registrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  matched_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  google_sheet_row_id TEXT,
  form_submitted_at TIMESTAMPTZ DEFAULT NOW(),
  synced_at TIMESTAMPTZ,
  donation_year BOOLEAN DEFAULT FALSE,
  registration_fee BOOLEAN DEFAULT FALSE,
  registration_points_granted_at TIMESTAMPTZ,
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, email)
);
CREATE TABLE IF NOT EXISTS public.checkin_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  registration_id UUID REFERENCES public.event_registrations(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  checkin_method TEXT,
  checked_in_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  checked_in_at TIMESTAMPTZ DEFAULT NOW(),
  checkin_points_granted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.point_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  registration_id UUID REFERENCES public.event_registrations(id) ON DELETE SET NULL,
  checkin_id UUID REFERENCES public.checkin_records(id) ON DELETE SET NULL,
  points INTEGER NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_events_start_at ON public.events (start_at);
CREATE INDEX IF NOT EXISTS idx_events_google_sheet_id ON public.events (google_sheet_id) WHERE google_sheet_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_normalized_email ON public.profiles (lower(email)) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_event_registrations_matched_user_id
  ON public.event_registrations (matched_user_id)
  WHERE matched_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_event_registrations_pending_points
  ON public.event_registrations (event_id, matched_user_id)
  WHERE registration_points_granted_at IS NULL AND matched_user_id IS NOT NULL;
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
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS tr_profiles_updated_at ON public.profiles;
CREATE TRIGGER tr_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
CREATE OR REPLACE FUNCTION public.sync_event_participants_from_registrations()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;
DROP TRIGGER IF EXISTS tr_sync_event_participants_from_registrations ON public.event_registrations;
CREATE TRIGGER tr_sync_event_participants_from_registrations
  AFTER INSERT OR UPDATE OR DELETE ON public.event_registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_event_participants_from_registrations();
CREATE OR REPLACE FUNCTION public.process_pending_points()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
BEGIN
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
    INSERT INTO public.point_transactions (user_id, event_id, registration_id, points, type, description)
    VALUES (r.user_id, r.event_id, r.registration_id, r.points, 'registration', '報名活動獎勵: ' || r.event_title);

    UPDATE public.profiles p
    SET points = COALESCE(p.points, 0) + r.points
    WHERE p.id = r.user_id;

    UPDATE public.event_registrations er
    SET registration_points_granted_at = NOW()
    WHERE er.id = r.registration_id;
  END LOOP;

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
    INSERT INTO public.point_transactions (user_id, event_id, checkin_id, points, type, description)
    VALUES (r.user_id, r.event_id, r.checkin_id, r.points, 'checkin', '活動簽到獎勵: ' || r.event_title);

    UPDATE public.profiles p
    SET points = COALESCE(p.points, 0) + r.points
    WHERE p.id = r.user_id;

    UPDATE public.checkin_records cr
    SET checkin_points_granted_at = NOW()
    WHERE cr.id = r.checkin_id;
  END LOOP;
END;
$$;
CREATE OR REPLACE FUNCTION public.process_event_registration_points(reg_id UUID DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.process_pending_points();
END;
$$;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkin_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own profile or admins can view all" ON public.profiles;
CREATE POLICY "Users can view own profile or admins can view all"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Users can view published events, own events, or admin events" ON public.events;
CREATE POLICY "Users can view published events, own events, or admin events"
  ON public.events FOR SELECT
  USING (status = 'published' OR created_by = auth.uid() OR public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Authenticated users can create own events" ON public.events;
CREATE POLICY "Authenticated users can create own events"
  ON public.events FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND created_by = auth.uid());
DROP POLICY IF EXISTS "Admins and creators can update events" ON public.events;
CREATE POLICY "Admins and creators can update events"
  ON public.events FOR UPDATE
  USING (created_by = auth.uid() OR public.is_admin(auth.uid()))
  WITH CHECK (created_by = auth.uid() OR public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins and creators can delete events" ON public.events;
CREATE POLICY "Admins and creators can delete events"
  ON public.events FOR DELETE
  USING (created_by = auth.uid() OR public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Users can view own registrations" ON public.event_registrations;
CREATE POLICY "Users can view own registrations"
  ON public.event_registrations FOR SELECT
  USING (auth.uid() = matched_user_id);
DROP POLICY IF EXISTS "Users can register for events" ON public.event_registrations;
CREATE POLICY "Users can register for events"
  ON public.event_registrations FOR INSERT
  WITH CHECK (auth.uid() = matched_user_id);
DROP POLICY IF EXISTS "Admins can view all registrations" ON public.event_registrations;
CREATE POLICY "Admins can view all registrations"
  ON public.event_registrations FOR SELECT
  USING (public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Users can view own checkins" ON public.checkin_records;
CREATE POLICY "Users can view own checkins"
  ON public.checkin_records FOR SELECT
  USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins can view all checkins" ON public.checkin_records;
CREATE POLICY "Admins can view all checkins"
  ON public.checkin_records FOR SELECT
  USING (public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins and authorized scanners can insert checkins" ON public.checkin_records;
CREATE POLICY "Admins and authorized scanners can insert checkins"
  ON public.checkin_records FOR INSERT
  WITH CHECK (
    auth.uid() = checked_in_by
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (p.role = 'admin' OR p.role = 'staff' OR COALESCE(p.scan_permission, FALSE))
    )
  );
DROP POLICY IF EXISTS "Users can view own transactions" ON public.point_transactions;
CREATE POLICY "Users can view own transactions"
  ON public.point_transactions FOR SELECT
  USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins can view all transactions" ON public.point_transactions;
CREATE POLICY "Admins can view all transactions"
  ON public.point_transactions FOR SELECT
  USING (public.is_admin(auth.uid()));
