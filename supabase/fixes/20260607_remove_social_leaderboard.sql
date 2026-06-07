-- Remove social leaderboard schema objects while preserving raffle threshold.
-- Run this in Supabase SQL Editor for existing environments.

DROP VIEW IF EXISTS public.social_leaderboard;

ALTER TABLE public.events
  DROP COLUMN IF EXISTS social_leaderboard;