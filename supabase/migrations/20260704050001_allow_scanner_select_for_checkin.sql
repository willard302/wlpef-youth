-- Allow scanner operators to read minimum data needed by check-in flow.
-- This covers both staff scanning member and staff scanning staff.

DROP POLICY IF EXISTS "Scanners can view profiles for checkin" ON public.profiles;
CREATE POLICY "Scanners can view profiles for checkin"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles operator_profile
      WHERE operator_profile.id = auth.uid()
        AND (
          operator_profile.role IN ('admin', 'staff')
          OR COALESCE(operator_profile.scan_permission, FALSE)
        )
    )
  );

DROP POLICY IF EXISTS "Scanners can view registrations for checkin" ON public.event_registrations;
CREATE POLICY "Scanners can view registrations for checkin"
  ON public.event_registrations FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles operator_profile
      WHERE operator_profile.id = auth.uid()
        AND (
          operator_profile.role IN ('admin', 'staff')
          OR COALESCE(operator_profile.scan_permission, FALSE)
        )
    )
  );

DROP POLICY IF EXISTS "Scanners can view checkins for checkin" ON public.checkin_records;
CREATE POLICY "Scanners can view checkins for checkin"
  ON public.checkin_records FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles operator_profile
      WHERE operator_profile.id = auth.uid()
        AND (
          operator_profile.role IN ('admin', 'staff')
          OR COALESCE(operator_profile.scan_permission, FALSE)
        )
    )
  );
