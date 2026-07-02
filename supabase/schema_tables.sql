-- ============================================================
-- WLPEF Youth - Tables, Indexes & RLS Policies
-- ============================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS supabase_vault;

-- 2. Profiles Table & RLS (Extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  avatar_url   TEXT,
  role         TEXT DEFAULT 'member', -- admin, member
  scan_permission BOOLEAN DEFAULT FALSE,
  email        TEXT,
  points       INTEGER DEFAULT 0,
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile or admins can view all" ON public.profiles;
CREATE POLICY "Users can view own profile or admins can view all"
  ON public.profiles FOR SELECT
  USING (
    auth.uid() = id
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 3. Calendar Events Table & RLS
CREATE TABLE IF NOT EXISTS public.events (
  id           UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  title        TEXT         NOT NULL,
  description  TEXT         DEFAULT '',
  location     TEXT         DEFAULT '',
  start_at     TIMESTAMPTZ  NOT NULL,
  end_at       TIMESTAMPTZ  NOT NULL,
  all_day      BOOLEAN      DEFAULT false,
  status       TEXT         DEFAULT 'draft',
  google_sheet_id TEXT,
  google_form_url TEXT,
  registration_bonus INTEGER DEFAULT 0,
  checkin_bonus INTEGER DEFAULT 0,
  raffle_threshold INTEGER DEFAULT 0,
  raffle_prizes JSONB DEFAULT '[]'::jsonb,
  participants TEXT[],
  created_by   UUID         REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ  DEFAULT NOW(),
  raffle_active BOOLEAN      NOT NULL DEFAULT false
);

-- Ensure schema updates are synced
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS google_sheet_id TEXT,
  ADD COLUMN IF NOT EXISTS google_form_url TEXT,
  ADD COLUMN IF NOT EXISTS registration_bonus INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS checkin_bonus INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS raffle_threshold INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS raffle_prizes JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS raffle_active boolean NOT NULL DEFAULT false;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email TEXT;

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

DROP POLICY IF EXISTS "everyone can view events" ON public.events;
CREATE POLICY "Users can view published events, own events, or admin events"
  ON public.events FOR SELECT
  USING (
    status = 'published'
    OR created_by = auth.uid()
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'  -- Inline fallback if function isn't ready yet
  );

DROP POLICY IF EXISTS "authenticated users can manage events" ON public.events;
CREATE POLICY "Authenticated users can create own events"
  ON public.events FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND created_by = auth.uid());

CREATE POLICY "Admins and creators can update events"
  ON public.events FOR UPDATE
  USING (
    created_by = auth.uid()
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  )
  WITH CHECK (
    created_by = auth.uid()
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Admins and creators can delete events"
  ON public.events FOR DELETE
  USING (
    created_by = auth.uid()
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE INDEX IF NOT EXISTS idx_events_start_at ON public.events (start_at);
CREATE INDEX IF NOT EXISTS idx_events_google_sheet_id ON public.events (google_sheet_id) WHERE google_sheet_id IS NOT NULL;

-- 4. Event Registrations & Checkins Tables, Indexes & RLS
CREATE TABLE IF NOT EXISTS public.event_registrations (
  id           UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id     UUID         REFERENCES public.events(id) ON DELETE CASCADE,
  matched_user_id UUID      REFERENCES public.profiles(id) ON DELETE CASCADE,
  email        TEXT         NOT NULL,
  name         TEXT,
  google_sheet_row_id TEXT,
  form_submitted_at TIMESTAMPTZ DEFAULT NOW(),
  synced_at    TIMESTAMPTZ,
  donation_year BOOLEAN DEFAULT FALSE,
  registration_fee BOOLEAN DEFAULT FALSE,
  registration_points_granted_at TIMESTAMPTZ,
  raw_data     JSONB,
  created_at   TIMESTAMPTZ  DEFAULT NOW(),
  UNIQUE(event_id, email)
);

CREATE INDEX IF NOT EXISTS idx_profiles_normalized_email ON public.profiles (lower(email)) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_event_registrations_matched_user_id
  ON public.event_registrations (matched_user_id)
  WHERE matched_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_event_registrations_pending_points
  ON public.event_registrations (event_id, matched_user_id)
  WHERE registration_points_granted_at IS NULL AND matched_user_id IS NOT NULL;

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

CREATE POLICY "Users can view own registrations"
  ON public.event_registrations FOR SELECT
  USING (auth.uid() = matched_user_id);

CREATE POLICY "Users can register for events"
  ON public.event_registrations FOR INSERT
  WITH CHECK (auth.uid() = matched_user_id);

CREATE POLICY "Users can view own checkins"
  ON public.checkin_records FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all registrations"
  ON public.event_registrations FOR SELECT
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Admins can view all checkins"
  ON public.checkin_records FOR SELECT
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Admins and authorized scanners can insert checkins"
  ON public.checkin_records FOR INSERT
  WITH CHECK (
    auth.uid() = checked_in_by
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (
          p.role = 'admin'
          OR p.role = 'staff'
          OR COALESCE(p.scan_permission, FALSE)
        )
    )
  );

-- 5. Point Transactions Table & RLS
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

CREATE POLICY "Admins can view all transactions"
  ON public.point_transactions FOR SELECT
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- 6. Raffle Winners Table & RLS
CREATE TABLE IF NOT EXISTS public.raffle_winners (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   uuid NOT NULL REFERENCES public.events(id)   ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  round      int  NOT NULL,
  name       text,
  points     int,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_raffle_winners_event_round
  ON public.raffle_winners (event_id, round);

ALTER TABLE public.raffle_winners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can view raffle winners" ON public.raffle_winners;
CREATE POLICY "Authenticated can view raffle winners"
  ON public.raffle_winners FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins manage raffle winners" ON public.raffle_winners;
CREATE POLICY "Admins manage raffle winners"
  ON public.raffle_winners FOR ALL
  TO authenticated
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

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