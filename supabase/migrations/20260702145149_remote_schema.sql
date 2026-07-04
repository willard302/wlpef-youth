create extension if not exists "pg_cron" with schema "pg_catalog";
drop index if exists "public"."idx_event_registrations_pending_invitation";
drop index if exists "public"."idx_raffle_winners_event_round";
alter table "public"."event_registrations" add column if not exists "demo_user" boolean default false;
alter table "public"."event_registrations" alter column "donation_year" set not null;
alter table "public"."event_registrations" alter column "registration_fee" set not null;
alter table "public"."raffle_winners" drop column if exists "round";
alter table "public"."raffle_winners" add column if not exists "prize" text not null default '';
alter table "public"."raffle_winners" alter column "prize" drop default;
CREATE INDEX IF NOT EXISTS idx_event_registrations_pending_invitation ON public.event_registrations USING btree (matched_user_id, demo_user, invitation_sent_at) WHERE ((matched_user_id IS NULL) AND (demo_user = true) AND (invitation_sent_at IS NULL));
CREATE INDEX IF NOT EXISTS idx_raffle_winners_event_round ON public.raffle_winners USING btree (event_id, prize);
set check_function_bodies = off;
CREATE OR REPLACE FUNCTION public.append_raffle_prizes(event_id uuid, new_prizes jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
declare
  updated_prizes jsonb;
begin
  update events
  set raffle_prizes = coalesce(raffle_prizes, '[]'::jsonb) || new_prizes
  where id = event_id
  returning raffle_prizes into updated_prizes;

  return updated_prizes;
end;
$function$;
CREATE OR REPLACE FUNCTION public.trigger_google_sheet_sync()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
      'recentFutureDays', 30
    )
  );
END;
$function$;
drop policy if exists "Users can insert own profile" on "public"."profiles";
create policy "Users can insert own profile"
  on "public"."profiles"
  as permissive
  for insert
  to public
with check ((auth.uid() = id));
