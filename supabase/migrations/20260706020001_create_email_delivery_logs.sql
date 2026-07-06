CREATE TABLE IF NOT EXISTS public.email_delivery_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  registration_id UUID REFERENCES public.event_registrations(id) ON DELETE SET NULL,
  campaign_key TEXT NOT NULL,
  email TEXT NOT NULL,
  normalized_email TEXT NOT NULL,
  recipient_name TEXT,
  status TEXT NOT NULL DEFAULT 'sent',
  provider TEXT NOT NULL DEFAULT 'brevo',
  provider_message_id TEXT,
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'email_delivery_logs_status_check'
      AND conrelid = 'public.email_delivery_logs'::regclass
  ) THEN
    ALTER TABLE public.email_delivery_logs
      ADD CONSTRAINT email_delivery_logs_status_check
      CHECK (status IN ('sent', 'failed'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_email_delivery_logs_unique_status
  ON public.email_delivery_logs (event_id, campaign_key, normalized_email, status);

CREATE INDEX IF NOT EXISTS idx_email_delivery_logs_event_campaign
  ON public.email_delivery_logs (event_id, campaign_key, status);

ALTER TABLE public.email_delivery_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all email delivery logs" ON public.email_delivery_logs;
CREATE POLICY "Admins can view all email delivery logs"
  ON public.email_delivery_logs FOR SELECT
  USING (public.is_admin(auth.uid()));
