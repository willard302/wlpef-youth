-- 表單同步截止規則調整（取代 formsPastDays 的統一 7 天窗口）：
--   打卡表單：活動結束後 2 小時關閉（checkinGraceMinutes: 120）
--   回饋表單：活動結束後隔天中午 12 點關閉（feedbackDeadlineDayOffset: 1 + feedbackDeadlineHour: 12，台灣時間）
--   報名 sheet：維持活動結束即停（recentPastDays: 0）
-- 對應 sync-google-sheet Edge Function 的參數變更。
CREATE OR REPLACE FUNCTION public.trigger_google_sheet_sync()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  project_url TEXT;
  service_role_key TEXT;
BEGIN
  SELECT decrypted_secret
    INTO project_url
    FROM vault.decrypted_secrets
   WHERE name = 'supabase_project_url'
   LIMIT 1;

  SELECT decrypted_secret
    INTO service_role_key
    FROM vault.decrypted_secrets
   WHERE name = 'supabase_service_role_key'
   LIMIT 1;

  IF project_url IS NULL OR service_role_key IS NULL THEN
    RAISE WARNING 'Missing Supabase Vault secrets for Google Sheet sync cron';
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := project_url || '/functions/v1/sync-google-sheet',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key
    ),
    body := jsonb_build_object(
      'mode', 'recent',
      'recentPastDays', 0,
      'recentFutureDays', 30,
      'checkinGraceMinutes', 120,
      'feedbackDeadlineDayOffset', 1,
      'feedbackDeadlineHour', 12
    )
  );
END;
$$;
