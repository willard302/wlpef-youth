-- Track donation and registration fee status from Google Sheet sync
ALTER TABLE public.event_registrations
ADD COLUMN IF NOT EXISTS donation_year BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS registration_fee BOOLEAN NOT NULL DEFAULT FALSE;
