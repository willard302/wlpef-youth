-- 移除殘留的舊同步排程 'sync-sheet-every-minute'：
-- 1) command 內硬編 service_role JWT（明文存於 cron.job）
-- 2) body 為 {}，落到 Edge Function 預設窗口（recentPastDays 14 / recentFutureDays 60），
--    繞過 trigger_google_sheet_sync() 的「報名表活動結束即停」設計
-- 3) 與 'sync-google-sheet-recent-minute'（每分鐘）重複觸發同一支 function
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-sheet-every-minute') THEN
    PERFORM cron.unschedule('sync-sheet-every-minute');
  END IF;
END $$;
