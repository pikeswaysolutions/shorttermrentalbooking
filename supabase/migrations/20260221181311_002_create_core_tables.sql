/*
  # Create Core Reference Tables

  1. New Tables
    - `event_types` - Event categories with pricing, duration, and email template config
      - `id` (uuid, primary key)
      - `name` (text) - Display name
      - `description` (text) - Description shown to customers
      - `base_rate` (numeric) - Hourly base rate in USD
      - `min_duration` (integer) - Minimum booking duration in hours
      - `cooldown_hours` (integer) - Buffer hours between events
      - `active` (boolean) - Whether visible to customers
      - `color` (text) - Display color hex code
      - `email_templates` (jsonb) - Contains confirmationAlias, followupAlias, followupDaysBefore
      - `confirmation_page` (jsonb) - Custom confirmation page config (title, message, buttons)
      - `created_at`, `updated_at` (timestamptz)

    - `pricing_rules` - Dynamic pricing rules for time/day-based rates
      - `id` (uuid, primary key)
      - `name` (text) - Rule display name
      - `event_type_id` (uuid, FK nullable) - If null, applies to all event types
      - `days` (integer[]) - Days of week (0=Sunday to 6=Saturday)
      - `start_time` (time) - Rule start time
      - `end_time` (time) - Rule end time
      - `hourly_rate` (numeric) - Hourly rate when rule applies
      - `created_at`, `updated_at` (timestamptz)

    - `add_ons` - Optional booking extras
      - `id` (uuid, primary key)
      - `name` (text) - Add-on name
      - `description` (text) - Add-on description
      - `price` (numeric) - Price (flat or hourly)
      - `type` (text) - 'flat' or 'hourly'
      - `active` (boolean) - Whether available to customers
      - `event_type_ids` (uuid[]) - Restrict to specific event types (empty = all)
      - `created_at`, `updated_at` (timestamptz)

    - `blocked_dates` - Dates/time slots blocked by admin
      - `id` (uuid, primary key)
      - `date` (date) - Blocked date
      - `reason` (text) - Reason for blocking
      - `is_full_day` (boolean) - Full day or time slot
      - `start_time` (time, nullable) - Start of blocked slot
      - `end_time` (time, nullable) - End of blocked slot
      - `created_at` (timestamptz)

    - `settings` - Singleton app configuration
      - `id` (integer, primary key, constrained to 1)
      - `primary_color` (text) - Brand primary color
      - `accent_color` (text) - Brand accent color
      - `company_name` (text) - Company display name
      - `logo` (text) - Base64-encoded logo image
      - `rental_policies` (jsonb) - Payment, cancellation, liability, cleanup policies
      - `api_keys_encrypted` (text) - Encrypted API keys (Resend etc.)
      - `created_at`, `updated_at` (timestamptz)

  2. Notes
    - All tables use UUID primary keys via gen_random_uuid()
    - Settings table uses singleton pattern (id constrained to 1)
    - Timestamps default to now()
*/

CREATE TABLE IF NOT EXISTS event_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  base_rate numeric NOT NULL DEFAULT 0,
  min_duration integer NOT NULL DEFAULT 1,
  cooldown_hours integer NOT NULL DEFAULT 1,
  active boolean NOT NULL DEFAULT true,
  color text NOT NULL DEFAULT '#000000',
  email_templates jsonb NOT NULL DEFAULT '{}',
  confirmation_page jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pricing_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  event_type_id uuid REFERENCES event_types(id) ON DELETE SET NULL,
  days integer[] NOT NULL DEFAULT '{}',
  start_time time NOT NULL,
  end_time time NOT NULL,
  hourly_rate numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS add_ons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  price numeric NOT NULL DEFAULT 0,
  type text NOT NULL DEFAULT 'flat' CHECK (type IN ('flat', 'hourly')),
  active boolean NOT NULL DEFAULT true,
  event_type_ids uuid[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS blocked_dates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  reason text NOT NULL DEFAULT '',
  is_full_day boolean NOT NULL DEFAULT true,
  start_time time,
  end_time time,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  primary_color text NOT NULL DEFAULT '#1d4ed8',
  accent_color text NOT NULL DEFAULT '#7c3aed',
  company_name text NOT NULL DEFAULT 'Luxe Events',
  logo text,
  rental_policies jsonb NOT NULL DEFAULT '{}',
  api_keys_encrypted text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
