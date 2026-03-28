/*
  # Enable Required Extensions

  1. Extensions
    - `pg_net` - Async HTTP client for calling Resend API from database functions
    - `pg_cron` - Job scheduler for daily follow-up email processing
*/

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
