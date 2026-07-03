-- 將 raffle_winners 從遠端手改的「prize 制」還原回本地既有的「round 制」。
--
-- 背景：
--   遠端 20260702145149_remote_schema.sql（由 Dashboard 手改後 db pull 產生）直接
--   DROP raffle_winners.round、ADD prize text NOT NULL，並把 index 改成 (event_id, prize)，
--   但沒有同步更新 draw_raffle（仍 INSERT round / 讀 MAX(round)），
--   導致遠端 draw_raffle 一呼叫就失敗（round 不存在 / prize 違反 NOT NULL）。
--
-- 需求確立：每輪抽出一個獎項，獎項名由 events.raffle_prizes 依 drawOrder 對應（round 制）。
--   → 中獎列只需記 round；prize 名為讀取時推導（見 get_active_raffle，20260703000001），
--     不需存在 raffle_winners。
--
-- 安全性：raffle_winners 目前為空表，可直接重建欄位，無需資料搬移。

-- 1) 還原欄位結構：移除 prize、加回 round，index 改回 (event_id, round)
DROP INDEX IF EXISTS public.idx_raffle_winners_event_round;

ALTER TABLE public.raffle_winners
  DROP COLUMN IF EXISTS prize;

-- 空表下 NOT NULL 直接加即可；以 DEFAULT 過渡再移除，避免殘留列時失敗。
ALTER TABLE public.raffle_winners
  ADD COLUMN IF NOT EXISTS round int NOT NULL DEFAULT 1;
ALTER TABLE public.raffle_winners
  ALTER COLUMN round DROP DEFAULT;

CREATE INDEX IF NOT EXISTS idx_raffle_winners_event_round
  ON public.raffle_winners (event_id, round);

-- 2) 重新確立 draw_raffle（round 版）。補回 round 欄位後即恢復正常，
--    此處重建以確保任一環境（含全新 DB）套用後語意一致。
CREATE OR REPLACE FUNCTION public.draw_raffle(p_event_id uuid, p_count int)
RETURNS SETOF public.raffle_winners
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_threshold int;
  v_round     int;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden: admin only';
  END IF;

  IF p_count IS NULL OR p_count < 1 OR p_count > 100 THEN
    RAISE EXCEPTION 'invalid count: must be between 1 and 100';
  END IF;

  SELECT COALESCE(e.raffle_threshold, 0) INTO v_threshold
  FROM public.events e
  WHERE e.id = p_event_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'event not found';
  END IF;

  SELECT COALESCE(MAX(w.round), 0) + 1 INTO v_round
  FROM public.raffle_winners w
  WHERE w.event_id = p_event_id;

  RETURN QUERY
  INSERT INTO public.raffle_winners AS rw (event_id, user_id, round, name, points)
  SELECT p_event_id, p.id, v_round, p.name, p.points
  FROM public.profiles p
  WHERE p.points >= v_threshold
    AND p.role <> 'admin'
    AND NOT EXISTS (
      SELECT 1 FROM public.raffle_winners w
      WHERE w.event_id = p_event_id AND w.user_id = p.id
    )
  ORDER BY random()
  LIMIT p_count
  RETURNING rw.*;
END;
$$;

REVOKE ALL ON FUNCTION public.draw_raffle(uuid, int) FROM public;
REVOKE ALL ON FUNCTION public.draw_raffle(uuid, int) FROM anon;
GRANT EXECUTE ON FUNCTION public.draw_raffle(uuid, int) TO authenticated;
