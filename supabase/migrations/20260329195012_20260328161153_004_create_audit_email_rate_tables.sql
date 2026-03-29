/*
  # Create Audit, Email Logs, and Rate Limiting Tables

  1. New Tables
    - `audit_logs` - Tracks all significant actions in the system
      - `id` (uuid, primary key)
      - `entity_type` (text) - Type of entity (booking, property, etc.)
      - `entity_id` (text) - ID of the affected entity
      - `action` (text) - Action performed (created, updated, deleted, status_changed)
      - `performed_by` (uuid, nullable) - User who performed the action
      - `old_value` (jsonb, nullable) - Previous state
      - `new_value` (jsonb, nullable) - New state
      - `created_at` (timestamptz)

    - `email_logs` - Tracks all emails sent by the system
      - `id` (uuid, primary key)
      - `booking_id` (uuid, FK) - Associated booking
      - `email_type` (text) - Type of email (confirmation, followup, etc.)
      - `recipient` (text) - Email recipient address
      - `subject` (text) - Email subject line
      - `status` (text) - sent, failed, pending
      - `error_message` (text, nullable) - Error details if failed
      - `sent_at` (timestamptz, nullable)
      - `created_at` (timestamptz)

    - `rate_limits` - IP-based rate limiting for public endpoints
      - `id` (uuid, primary key)
      - `ip_address` (text) - Client IP address
      - `endpoint` (text) - API endpoint being rate limited
      - `request_count` (integer) - Number of requests in window
      - `window_start` (timestamptz) - Start of rate limit window

    - `settings` - Singleton app configuration table
      - `id` (integer, constrained to 1) - Ensures only one row
      - `primary_color` (text) - Brand primary color hex
      - `accent_color` (text) - Brand accent color hex
      - `company_name` (text) - Company display name
      - `logo` (text, nullable) - Logo URL or base64
      - `rental_policies` (jsonb) - Cancellation, house rules, etc.
      - `api_keys_encrypted` (text, nullable) - Encrypted API keys
      - `standard_check_in_time` (text) - Default check-in time
      - `standard_check_out_time` (text) - Default check-out time
      - `created_at`, `updated_at` (timestamptz)

  2. Notes
    - Audit logs provide full audit trail for compliance
    - Email logs enable debugging and resending failed emails
    - Rate limits protect against abuse of public booking endpoint
    - Settings uses singleton pattern with CHECK constraint
*/

CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  action text NOT NULL,
  performed_by uuid,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid,
  email_type text NOT NULL,
  recipient text NOT NULL,
  subject text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text NOT NULL,
  endpoint text NOT NULL,
  request_count integer NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  primary_color text NOT NULL DEFAULT '#1d4ed8',
  accent_color text NOT NULL DEFAULT '#059669',
  company_name text NOT NULL DEFAULT 'Luxe Rentals',
  logo text,
  rental_policies jsonb NOT NULL DEFAULT '{}',
  api_keys_encrypted text,
  standard_check_in_time text NOT NULL DEFAULT '15:00',
  standard_check_out_time text NOT NULL DEFAULT '11:00',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
