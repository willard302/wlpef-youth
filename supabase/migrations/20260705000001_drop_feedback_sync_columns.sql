-- Remove deprecated feedback sync controls.
-- Feedback syncing is now explicitly triggered by syncTarget and feedback_response_sheet_id.

ALTER TABLE public.events
  DROP CONSTRAINT IF EXISTS events_feedback_sync_start_offset_minutes_check;

ALTER TABLE public.events
  DROP COLUMN IF EXISTS feedback_sync_enabled,
  DROP COLUMN IF EXISTS feedback_sync_start_offset_minutes;
