-- 抽獎中獎名單
CREATE TABLE IF NOT EXISTS public.raffle_winners (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   uuid NOT NULL REFERENCES public.events(id)   ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  round      int  NOT NULL,
  name       text,
  points     int,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)            -- 同活動不能中兩次
);

CREATE INDEX IF NOT EXISTS idx_raffle_winners_event_round
  ON public.raffle_winners (event_id, round);

ALTER TABLE public.raffle_winners ENABLE ROW LEVEL SECURITY;

-- 中獎名單本就公開於大螢幕：登入者可讀
DROP POLICY IF EXISTS "Authenticated can view raffle winners" ON public.raffle_winners;
CREATE POLICY "Authenticated can view raffle winners"
  ON public.raffle_winners FOR SELECT
  TO authenticated
  USING (true);

-- 寫入僅 admin（實際寫入走 draw_raffle SECURITY DEFINER，此政策防止直接竄改）
DROP POLICY IF EXISTS "Admins manage raffle winners" ON public.raffle_winners;
CREATE POLICY "Admins manage raffle winners"
  ON public.raffle_winners FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- 「目前哪場活動正在抽獎」的開關
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS raffle_active boolean NOT NULL DEFAULT false;
