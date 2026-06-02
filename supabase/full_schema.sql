-- ============================================================
-- WLPEF Youth - Full Schema Definition
-- ============================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Profiles (Extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  avatar_url   TEXT,
  role         TEXT DEFAULT 'member', -- admin, member
  department   TEXT,
  phone_number TEXT,
  points       INTEGER DEFAULT 0,
  bio          TEXT,
  gender       TEXT,
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles RLS
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Disable auto-creating profile on signup.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 3. Calendar Events
CREATE TABLE IF NOT EXISTS public.events (
  id           UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  title        TEXT         NOT NULL,
  description  TEXT         DEFAULT '',
  location     TEXT         DEFAULT '',
  start_at     TIMESTAMPTZ  NOT NULL,
  end_at       TIMESTAMPTZ  NOT NULL,
  all_day      BOOLEAN      DEFAULT false,
  color        TEXT         DEFAULT '#38bdf8',
  status       TEXT         DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'closed')),
  google_form_url TEXT,
  google_sheet_id TEXT,
  subdomain    TEXT,
  registration_bonus INTEGER DEFAULT 0,
  checkin_bonus INTEGER DEFAULT 0,
  raffle_threshold INTEGER DEFAULT 0,
  participants TEXT[],
  created_by   UUID         REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ  DEFAULT NOW()
);

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS google_form_url TEXT,
  ADD COLUMN IF NOT EXISTS google_sheet_id TEXT,
  ADD COLUMN IF NOT EXISTS subdomain TEXT,
  ADD COLUMN IF NOT EXISTS registration_bonus INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS checkin_bonus INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS raffle_threshold INTEGER DEFAULT 0;

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

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "everyone can view events"
  ON public.events FOR SELECT
  USING (true);

CREATE POLICY "authenticated users can manage events"
  ON public.events FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE INDEX IF NOT EXISTS idx_events_start_at ON public.events (start_at);

-- 4. Event Registrations & Checkins
CREATE TABLE IF NOT EXISTS public.event_registrations (
  id           UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id     UUID         REFERENCES public.events(id) ON DELETE CASCADE,
  matched_user_id UUID      REFERENCES public.profiles(id) ON DELETE CASCADE,
  email        TEXT         NOT NULL,
  name         TEXT,
  google_sheet_row_id TEXT,
  form_submitted_at TIMESTAMPTZ DEFAULT NOW(),
  synced_at    TIMESTAMPTZ,
  registration_points_granted_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ  DEFAULT NOW(),
  UNIQUE(event_id, email)
);

CREATE TABLE IF NOT EXISTS public.checkin_records (
  id           UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id     UUID         REFERENCES public.events(id) ON DELETE CASCADE,
  user_id      UUID         REFERENCES public.profiles(id) ON DELETE CASCADE,
  registration_id UUID      REFERENCES public.event_registrations(id) ON DELETE SET NULL,
  email        TEXT         NOT NULL,
  checkin_method TEXT,       -- manual, qr_code, nfc
  checked_in_by UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  checked_in_at TIMESTAMPTZ  DEFAULT NOW(),
  checkin_points_granted_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ  DEFAULT NOW()
);

ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkin_records ENABLE ROW LEVEL SECURITY;

-- Registrations RLS
CREATE POLICY "Users can view own registrations"
  ON public.event_registrations FOR SELECT
  USING (auth.uid() = matched_user_id);

CREATE POLICY "Users can register for events"
  ON public.event_registrations FOR INSERT
  WITH CHECK (auth.uid() = matched_user_id);

-- Checkins RLS
CREATE POLICY "Users can view own checkins"
  ON public.checkin_records FOR SELECT
  USING (auth.uid() = user_id);

-- Admin can view all
CREATE POLICY "Admins can view all registrations"
  ON public.event_registrations FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can view all checkins"
  ON public.checkin_records FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 5. Point Transactions
CREATE TABLE IF NOT EXISTS public.point_transactions (
  id           UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID         REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_id     UUID         REFERENCES public.events(id) ON DELETE SET NULL,
  registration_id UUID      REFERENCES public.event_registrations(id) ON DELETE SET NULL,
  checkin_id   UUID         REFERENCES public.checkin_records(id) ON DELETE SET NULL,
  points       INTEGER      NOT NULL,
  type         TEXT         NOT NULL, -- registration, checkin, bonus, manual
  description  TEXT,
  created_at   TIMESTAMPTZ  DEFAULT NOW()
);

ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions"
  ON public.point_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- 6. Point Granting Logic (Unified & Batch)
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

-- 7. Realtime Enablement
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
