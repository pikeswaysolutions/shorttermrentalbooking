/*
  # Set up daily follow-up email scheduler for STR bookings

  1. Cron Job
    - Creates a pg_cron job named 'send-followup-emails-daily'
    - Runs at 9:00 AM Eastern Time (14:00 UTC) every day
    - Uses pg_net to call the send-followup-emails edge function
    - Passes the service role key for authentication

  2. Notes
    - The cron schedule uses UTC time (14:00 UTC = 9:00 AM ET during EST)
    - The edge function handles finding confirmed bookings where check-out date 
      was 3+ days ago and sends follow-up emails via Resend
    - pg_net extension is used for HTTP requests from within PostgreSQL
*/

-- Unschedule existing job if it exists
SELECT cron.unschedule('send-followup-emails-daily') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'send-followup-emails-daily'
);

-- Schedule the cron job
SELECT cron.schedule(
  'send-followup-emails-daily',
  '0 14 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/send-followup-emails',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
