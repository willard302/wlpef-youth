-- 拆分 point_transactions 的 'bonus' type：
--   回饋表單獎勵 → 'feedback'、打卡表單獎勵 → 'checkin_form'
-- 背景：線上 DB 有 UNIQUE (user_id, event_id, type)，兩種表單獎勵共用 'bonus'
-- 導致同一人同一活動第二筆 bonus 撞 23505，整包 process_pending_points() rollback。

-- 1. 回填既有資料（只改 type 標籤，不動 points，不會重複發點）
UPDATE public.point_transactions
SET type = 'feedback'
WHERE type = 'bonus'
  AND description LIKE '回饋完成獎勵:%';

UPDATE public.point_transactions
SET type = 'checkin_form'
WHERE type = 'bonus'
  AND description LIKE '打卡表單完成獎勵:%';

-- 2. 補進線上已存在的唯一鍵，消除 schema drift
--    （拆完 type 後此鍵成為各來源「每人每活動最多發一次」的冪等保護）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'point_transactions_user_id_event_id_type_key'
      AND conrelid = 'public.point_transactions'::regclass
  ) THEN
    ALTER TABLE public.point_transactions
      ADD CONSTRAINT point_transactions_user_id_event_id_type_key
      UNIQUE (user_id, event_id, type);
  END IF;
END $$;

-- 3. 重建發點函式：僅回饋表單與打卡表單兩個迴圈的 type 值改變，其餘邏輯不動
CREATE OR REPLACE FUNCTION public.process_pending_points()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT
      er.id as registration_id,
      er.matched_user_id as user_id,
      er.event_id,
      e.title as event_title,
      e.registration_bonus as points
    FROM public.event_registrations er
    JOIN public.events e ON er.event_id = e.id
    WHERE er.registration_points_granted_at IS NULL
      AND er.matched_user_id IS NOT NULL
      AND e.registration_bonus > 0
  LOOP
    INSERT INTO public.point_transactions (user_id, event_id, registration_id, points, type, description)
    VALUES (r.user_id, r.event_id, r.registration_id, r.points, 'registration', '報名活動獎勵: ' || r.event_title);

    UPDATE public.profiles p
    SET points = COALESCE(p.points, 0) + r.points
    WHERE p.id = r.user_id;

    UPDATE public.event_registrations er
    SET registration_points_granted_at = NOW()
    WHERE er.id = r.registration_id;
  END LOOP;

  FOR r IN
    SELECT
      cr.id as checkin_id,
      cr.user_id,
      cr.event_id,
      e.title as event_title,
      e.checkin_bonus as points
    FROM public.checkin_records cr
    JOIN public.events e ON cr.event_id = e.id
    WHERE cr.checkin_points_granted_at IS NULL
      AND cr.user_id IS NOT NULL
      AND e.checkin_bonus > 0
  LOOP
    INSERT INTO public.point_transactions (user_id, event_id, checkin_id, points, type, description)
    VALUES (r.user_id, r.event_id, r.checkin_id, r.points, 'checkin', '活動簽到獎勵: ' || r.event_title);

    UPDATE public.profiles p
    SET points = COALESCE(p.points, 0) + r.points
    WHERE p.id = r.user_id;

    UPDATE public.checkin_records cr
    SET checkin_points_granted_at = NOW()
    WHERE cr.id = r.checkin_id;
  END LOOP;

  FOR r IN
    SELECT
      fr.id AS feedback_response_id,
      fr.matched_user_id AS user_id,
      fr.event_id,
      e.title AS event_title,
      e.feedback_bonus_points AS points
    FROM public.event_feedback_responses fr
    JOIN public.events e ON e.id = fr.event_id
    WHERE fr.feedback_points_granted_at IS NULL
      AND fr.matched_user_id IS NOT NULL
      AND e.feedback_bonus_points > 0
      AND EXISTS (
        SELECT 1
        FROM public.event_registrations er
        WHERE er.event_id = fr.event_id
          AND er.matched_user_id = fr.matched_user_id
      )
      AND EXISTS (
        SELECT 1
        FROM public.checkin_records cr
        WHERE cr.event_id = fr.event_id
          AND cr.user_id = fr.matched_user_id
      )
  LOOP
    INSERT INTO public.point_transactions (user_id, event_id, points, type, description)
    VALUES (r.user_id, r.event_id, r.points, 'feedback', '回饋完成獎勵: ' || r.event_title);

    UPDATE public.profiles p
    SET points = COALESCE(p.points, 0) + r.points
    WHERE p.id = r.user_id;

    UPDATE public.event_feedback_responses fr
    SET feedback_points_granted_at = NOW()
    WHERE fr.id = r.feedback_response_id;
  END LOOP;

  FOR r IN
    SELECT
      cr.id AS checkin_response_id,
      cr.matched_user_id AS user_id,
      cr.event_id,
      e.title AS event_title,
      e.checkin_form_bonus_points AS points
    FROM public.event_checkin_responses cr
    JOIN public.events e ON e.id = cr.event_id
    WHERE cr.checkin_form_points_granted_at IS NULL
      AND cr.matched_user_id IS NOT NULL
      AND e.checkin_form_bonus_points > 0
      AND EXISTS (
        SELECT 1
        FROM public.event_registrations er
        WHERE er.event_id = cr.event_id
          AND er.matched_user_id = cr.matched_user_id
      )
      AND EXISTS (
        SELECT 1
        FROM public.checkin_records ck
        WHERE ck.event_id = cr.event_id
          AND ck.user_id = cr.matched_user_id
      )
  LOOP
    INSERT INTO public.point_transactions (user_id, event_id, points, type, description)
    VALUES (r.user_id, r.event_id, r.points, 'checkin_form', '打卡表單完成獎勵: ' || r.event_title);

    UPDATE public.profiles p
    SET points = COALESCE(p.points, 0) + r.points
    WHERE p.id = r.user_id;

    UPDATE public.event_checkin_responses cr
    SET checkin_form_points_granted_at = NOW()
    WHERE cr.id = r.checkin_response_id;
  END LOOP;
END;
$$;
