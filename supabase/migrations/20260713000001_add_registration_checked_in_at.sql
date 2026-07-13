ALTER TABLE public.event_registrations
  ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ;

-- 補齊既有資料：若簽到紀錄已經綁定 registration_id，就把簽到時間回填到報名表
UPDATE public.event_registrations er
SET checked_in_at = latest_checkin.checked_in_at
FROM (
  SELECT
    cr.registration_id,
    MAX(cr.checked_in_at) AS checked_in_at
  FROM public.checkin_records cr
  WHERE cr.registration_id IS NOT NULL
    AND cr.checked_in_at IS NOT NULL
  GROUP BY cr.registration_id
) AS latest_checkin
WHERE er.id = latest_checkin.registration_id;

-- 若既有簽到資料還沒帶 registration_id，嘗試用同一活動 + 同一會員回填
UPDATE public.checkin_records cr
SET registration_id = er.id
FROM public.event_registrations er
WHERE cr.registration_id IS NULL
  AND cr.event_id = er.event_id
  AND cr.user_id = er.matched_user_id;

UPDATE public.event_registrations er
SET checked_in_at = latest_checkin.checked_in_at
FROM (
  SELECT
    cr.registration_id,
    MAX(cr.checked_in_at) AS checked_in_at
  FROM public.checkin_records cr
  WHERE cr.registration_id IS NOT NULL
    AND cr.checked_in_at IS NOT NULL
  GROUP BY cr.registration_id
) AS latest_checkin
WHERE er.id = latest_checkin.registration_id
  AND er.checked_in_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_event_registrations_checked_in_at
  ON public.event_registrations (event_id, checked_in_at)
  WHERE checked_in_at IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_event_registrations_event_matched_user_unique
  ON public.event_registrations (event_id, matched_user_id)
  WHERE matched_user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_checkin_records_event_user_unique
  ON public.checkin_records (event_id, user_id)
  WHERE user_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.sync_event_registration_checked_in_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_registration_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.registration_id IS NOT NULL THEN
      UPDATE public.event_registrations er
      SET checked_in_at = (
        SELECT MAX(cr.checked_in_at)
        FROM public.checkin_records cr
        WHERE cr.registration_id = OLD.registration_id
      )
      WHERE er.id = OLD.registration_id;
    END IF;

    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE'
    AND OLD.registration_id IS DISTINCT FROM NEW.registration_id
    AND OLD.registration_id IS NOT NULL THEN
    UPDATE public.event_registrations er
    SET checked_in_at = (
      SELECT MAX(cr.checked_in_at)
      FROM public.checkin_records cr
      WHERE cr.registration_id = OLD.registration_id
    )
    WHERE er.id = OLD.registration_id;
  END IF;

  target_registration_id := NEW.registration_id;

  IF target_registration_id IS NULL
    AND NEW.event_id IS NOT NULL
    AND NEW.user_id IS NOT NULL THEN
    SELECT er.id
    INTO target_registration_id
    FROM public.event_registrations er
    WHERE er.event_id = NEW.event_id
      AND er.matched_user_id = NEW.user_id
    LIMIT 1;
  END IF;

  IF target_registration_id IS NOT NULL THEN
    UPDATE public.event_registrations er
    SET checked_in_at = NEW.checked_in_at
    WHERE er.id = target_registration_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_sync_event_registration_checked_in_at ON public.checkin_records;
CREATE TRIGGER tr_sync_event_registration_checked_in_at
  AFTER INSERT OR UPDATE OR DELETE ON public.checkin_records
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_event_registration_checked_in_at();
