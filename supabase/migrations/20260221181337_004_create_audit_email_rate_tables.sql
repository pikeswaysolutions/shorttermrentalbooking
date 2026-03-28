/*
  # Create Audit Logs, Email Logs, and Rate Limits Tables

  1. New Tables
    - `audit_logs` - Tracks all system changes for accountability
      - `id` (uuid, primary key)
      - `entity_type` (text) - Type of entity (booking, event_type, etc.)
      - `entity_id` (text) - ID of the entity
      - `action` (text) - What happened (created, updated, status_changed, etc.)
      - `performed_by` (uuid, nullable) - Admin user ID or null for public actions
      - `timestamp` (timestamptz) - When it happened
      - `previous_value` (jsonb, nullable) - State before change
      - `new_value` (jsonb, nullable) - State after change

    - `email_logs` - Tracks all email send attempts
      - `id` (uuid, primary key)
      - `booking_id` (uuid, FK to bookings)
      - `type` (text) - 'confirmation' or 'followup'
      - `status` (text) - 'sent' or 'failed'
      - `error_message` (text, nullable) - Error details if failed
      - `sent_at` (timestamptz) - When the send was attempted

    - `rate_limits` - IP-based rate limiting tracker
      - `id` (uuid, primary key)
      - `ip_address` (text) - Client IP
      - `endpoint` (text) - Which endpoint was called
      - `request_count` (integer) - Requests in this window
      - `window_start` (timestamptz) - Start of rate limit window
*/

CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  action text NOT NULL,
  performed_by uuid,
  timestamp timestamptz NOT NULL DEFAULT now(),
  previous_value jsonb,
  new_value jsonb
);

CREATE TABLE IF NOT EXISTS email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id),
  type text NOT NULL CHECK (type IN ('confirmation', 'followup')),
  status text NOT NULL CHECK (status IN ('sent', 'failed')),
  error_message text,
  sent_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text NOT NULL,
  endpoint text NOT NULL,
  request_count integer NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT now()
);
