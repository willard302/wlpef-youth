-- Hotfix: avoid infinite recursion in profiles RLS policy.
-- Root cause: policy expression on profiles queried profiles again.

CREATE OR REPLACE FUNCTION public.can_scan_checkin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = user_id
      AND (
        p.role IN ('admin', 'staff')
        OR COALESCE(p.scan_permission, FALSE)
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.can_scan_checkin(UUID) TO authenticated;

DROP POLICY IF EXISTS "Scanners can view profiles for checkin" ON public.profiles;
CREATE POLICY "Scanners can view profiles for checkin"
  ON public.profiles FOR SELECT
  USING (public.can_scan_checkin(auth.uid()));

DROP POLICY IF EXISTS "Scanners can view registrations for checkin" ON public.event_registrations;
CREATE POLICY "Scanners can view registrations for checkin"
  ON public.event_registrations FOR SELECT
  USING (public.can_scan_checkin(auth.uid()));

DROP POLICY IF EXISTS "Scanners can view checkins for checkin" ON public.checkin_records;
CREATE POLICY "Scanners can view checkins for checkin"
  ON public.checkin_records FOR SELECT
  USING (public.can_scan_checkin(auth.uid()));
