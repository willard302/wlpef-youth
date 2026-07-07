-- Revoke scanner permission from raffle_staff.
-- Scanner is limited to admin/staff only.

BEGIN;

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
      AND p.role IN ('admin', 'staff')
  );
$$;

GRANT EXECUTE ON FUNCTION public.can_scan_checkin(UUID) TO authenticated;

COMMIT;
