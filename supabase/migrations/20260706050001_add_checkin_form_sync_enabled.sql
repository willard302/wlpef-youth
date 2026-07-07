ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS checkin_form_sync_enabled BOOLEAN NOT NULL DEFAULT false;
