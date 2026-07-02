-- Track whether matched member has completed first login
ALTER TABLE public.event_registrations
ADD COLUMN IF NOT EXISTS first_login_enabled BOOLEAN NOT NULL DEFAULT FALSE;

-- Useful for admin filtering and dashboard aggregations
CREATE INDEX IF NOT EXISTS idx_event_registrations_first_login_enabled
ON public.event_registrations (event_id, first_login_enabled);

-- Backfill existing rows that already have auth last_sign_in_at
UPDATE public.event_registrations AS er
SET first_login_enabled = TRUE
FROM auth.users AS au
WHERE er.matched_user_id = au.id
  AND au.last_sign_in_at IS NOT NULL
  AND er.first_login_enabled = FALSE;

-- Keep first_login_enabled synced when auth.users gets first login timestamp
CREATE OR REPLACE FUNCTION public.sync_registration_first_login_enabled()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.last_sign_in_at IS NOT NULL
    AND (OLD.last_sign_in_at IS NULL OR NEW.last_sign_in_at <> OLD.last_sign_in_at)
  THEN
    UPDATE public.event_registrations
    SET first_login_enabled = TRUE
    WHERE matched_user_id = NEW.id
      AND first_login_enabled = FALSE;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_sync_registration_first_login_enabled ON auth.users;
CREATE TRIGGER tr_sync_registration_first_login_enabled
  AFTER UPDATE OF last_sign_in_at ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_registration_first_login_enabled();
