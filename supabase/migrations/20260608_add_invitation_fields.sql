-- Add fields to track invitations and demo status
ALTER TABLE public.event_registrations 
ADD COLUMN IF NOT EXISTS demo_user BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS invitation_sent_at TIMESTAMPTZ;

-- Index for efficient lookup of pending invitations
CREATE INDEX IF NOT EXISTS idx_event_registrations_pending_invitation 
ON public.event_registrations (matched_user_id, demo_user, invitation_sent_at) 
WHERE matched_user_id IS NULL AND demo_user = TRUE AND invitation_sent_at IS NULL;
