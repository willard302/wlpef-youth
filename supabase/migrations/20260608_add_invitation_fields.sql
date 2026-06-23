-- Add fields to track invitations and demo status
ALTER TABLE public.event_registrations 
ADD COLUMN IF NOT EXISTS demo_user BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS invitation_sent_at TIMESTAMPTZ;

-- Index for efficient lookup of pending invitations
CREATE INDEX IF NOT EXISTS idx_event_registrations_pending_invitation 
ON public.event_registrations (matched_user_id, demo_user, invitation_sent_at) 
WHERE matched_user_id IS NULL AND demo_user = TRUE AND invitation_sent_at IS NULL;

-- Add scanner permission flag to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS scan_permission BOOLEAN NOT NULL DEFAULT FALSE;

-- Allow admins to update member profile permissions (including scanner permission)
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles"
	ON public.profiles FOR UPDATE
	USING (public.is_admin(auth.uid()))
	WITH CHECK (public.is_admin(auth.uid()));

-- Allow admins and explicitly authorized members to insert check-in records
DROP POLICY IF EXISTS "Admins and authorized scanners can insert checkins" ON public.checkin_records;
CREATE POLICY "Admins and authorized scanners can insert checkins"
	ON public.checkin_records FOR INSERT
	WITH CHECK (
		auth.uid() = checked_in_by
		AND EXISTS (
			SELECT 1
			FROM public.profiles p
			WHERE p.id = auth.uid()
				AND (
					((p.role = 'admin') OR (p.role = 'staff'))
					OR COALESCE(p.scan_permission, FALSE)
				)
		)
	);
