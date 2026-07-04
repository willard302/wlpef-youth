ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS feedback_form_url TEXT,
  ADD COLUMN IF NOT EXISTS feedback_form_google_id TEXT,
  ADD COLUMN IF NOT EXISTS feedback_response_sheet_id TEXT,
  ADD COLUMN IF NOT EXISTS feedback_sync_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS feedback_sync_start_offset_minutes INTEGER NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS feedback_bonus_points INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS feedback_visibility_mode TEXT NOT NULL DEFAULT 'test';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'events_feedback_visibility_mode_check'
      AND conrelid = 'public.events'::regclass
  ) THEN
    ALTER TABLE public.events
      ADD CONSTRAINT events_feedback_visibility_mode_check
      CHECK (feedback_visibility_mode IN ('test', 'live'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'events_feedback_sync_start_offset_minutes_check'
      AND conrelid = 'public.events'::regclass
  ) THEN
    ALTER TABLE public.events
      ADD CONSTRAINT events_feedback_sync_start_offset_minutes_check
      CHECK (feedback_sync_start_offset_minutes >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'events_feedback_bonus_points_check'
      AND conrelid = 'public.events'::regclass
  ) THEN
    ALTER TABLE public.events
      ADD CONSTRAINT events_feedback_bonus_points_check
      CHECK (feedback_bonus_points >= 0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_events_feedback_response_sheet_id
  ON public.events (feedback_response_sheet_id)
  WHERE feedback_response_sheet_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.event_feedback_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  matched_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  normalized_email TEXT GENERATED ALWAYS AS (lower(trim(email))) STORED,
  google_sheet_row_id TEXT,
  form_submitted_at TIMESTAMPTZ DEFAULT NOW(),
  synced_at TIMESTAMPTZ,
  feedback_points_granted_at TIMESTAMPTZ,
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (event_id, email)
);

CREATE INDEX IF NOT EXISTS idx_event_feedback_responses_matched_user_id
  ON public.event_feedback_responses (matched_user_id)
  WHERE matched_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_event_feedback_responses_pending_points
  ON public.event_feedback_responses (event_id, matched_user_id)
  WHERE feedback_points_granted_at IS NULL AND matched_user_id IS NOT NULL;

ALTER TABLE public.event_feedback_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own feedback responses" ON public.event_feedback_responses;
CREATE POLICY "Users can view own feedback responses"
  ON public.event_feedback_responses FOR SELECT
  USING (auth.uid() = matched_user_id);

DROP POLICY IF EXISTS "Admins can view all feedback responses" ON public.event_feedback_responses;
CREATE POLICY "Admins can view all feedback responses"
  ON public.event_feedback_responses FOR SELECT
  USING (public.is_admin(auth.uid()));

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.event_feedback_responses;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

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

  FOR r IN
    SELECT
      fr.id AS feedback_response_id,
      fr.matched_user_id AS user_id,
      fr.event_id,
      e.title AS event_title,
      e.feedback_bonus_points AS points
    FROM public.event_feedback_responses fr
    JOIN public.events e ON e.id = fr.event_id
    WHERE fr.feedback_points_granted_at IS NULL
      AND fr.matched_user_id IS NOT NULL
      AND e.feedback_bonus_points > 0
      AND EXISTS (
        SELECT 1
        FROM public.event_registrations er
        WHERE er.event_id = fr.event_id
          AND er.matched_user_id = fr.matched_user_id
      )
      AND EXISTS (
        SELECT 1
        FROM public.checkin_records cr
        WHERE cr.event_id = fr.event_id
          AND cr.user_id = fr.matched_user_id
      )
  LOOP
    INSERT INTO public.point_transactions (user_id, event_id, points, type, description)
    VALUES (r.user_id, r.event_id, r.points, 'bonus', '回饋完成獎勵: ' || r.event_title);

    UPDATE public.profiles p
    SET points = COALESCE(p.points, 0) + r.points
    WHERE p.id = r.user_id;

    UPDATE public.event_feedback_responses fr
    SET feedback_points_granted_at = NOW()
    WHERE fr.id = r.feedback_response_id;
  END LOOP;
END;
$$;
