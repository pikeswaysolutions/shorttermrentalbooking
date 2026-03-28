/*
  # Create Core Reference Tables for Short-Term Rental Platform

  1. New Tables
    - `properties` - Rental property listings (formerly event_types)
      - `id` (uuid, primary key)
      - `name` (text) - Property name
      - `description` (text) - Property description
      - `base_nightly_rate` (numeric) - Base rate per night in USD
      - `cleaning_fee` (numeric) - One-time cleaning fee per stay
      - `min_nights` (integer) - Minimum number of nights for booking
      - `max_guests` (integer) - Maximum number of guests allowed
      - `image_url` (text, nullable) - URL to property image
      - `is_active` (boolean) - Whether property is available for booking
      - `theme_color` (text) - Display color hex code for UI
      - `email_templates` (jsonb) - Contains confirmationAlias, followupAlias, followupDaysBefore
      - `confirmation_page` (jsonb) - Custom confirmation page config (title, message, buttons)
      - `created_at`, `updated_at` (timestamptz)

    - `pricing_rules` - Dynamic pricing rules for nightly rates
      - `id` (uuid, primary key)
      - `name` (text) - Rule display name
      - `property_id` (uuid, FK nullable) - If null, applies to all properties
      - `rule_type` (text) - 'day_of_week', 'date_override', or 'date_range'
      - `day_of_week` (integer, nullable) - 0=Sunday to 6=Saturday (for weekly patterns)
      - `specific_date` (date, nullable) - For single-date overrides
      - `start_date` (date, nullable) - For date range rules
      - `end_date` (date, nullable) - For date range rules
      - `days` (integer[], nullable) - Array of days for day_of_week rules
      - `nightly_rate` (numeric) - The nightly rate to apply
      - `priority` (integer) - Higher priority wins when multiple rules match
      - `is_active` (boolean) - Allow disabling without deleting
      - `created_at`, `updated_at` (timestamptz)

    - `add_ons` - Optional booking extras
      - `id` (uuid, primary key)
      - `name` (text) - Add-on name
      - `description` (text) - Add-on description
      - `price` (numeric) - Price (flat or per night)
      - `type` (text) - 'flat' (one-time) or 'per_night' (multiplied by nights)
      - `active` (boolean) - Whether available to customers
      - `property_ids` (uuid[]) - Restrict to specific properties (empty = all)
      - `created_at`, `updated_at` (timestamptz)

    - `blocked_dates` - Dates blocked for booking
      - `id` (uuid, primary key)
      - `date` (date) - Blocked date
      - `property_id` (uuid, FK nullable) - If null, blocks for all properties
      - `reason` (text) - Reason for blocking
      - `created_at` (timestamptz)

    - `settings` - Singleton app configuration
      - `id` (integer, primary key, constrained to 1)
      - `primary_color` (text) - Brand primary color
      - `accent_color` (text) - Brand accent color
      - `company_name` (text) - Company display name
      - `logo` (text, nullable) - Logo image URL or base64
      - `standard_check_in_time` (text) - Standard check-in time (e.g., '15:00')
      - `standard_check_out_time` (text) - Standard check-out time (e.g., '11:00')
      - `rental_policies` (jsonb) - Cancellation, house rules, etc.
      - `api_keys_encrypted` (text) - Encrypted API keys
      - `created_at`, `updated_at` (timestamptz)

  2. Notes
    - All tables use UUID primary keys via gen_random_uuid()
    - Settings table uses singleton pattern (id constrained to 1)
    - Timestamps default to now()
    - Pricing rules use priority system for conflict resolution
*/

-- Drop old tables first
DROP TABLE IF EXISTS event_types CASCADE;
DROP TABLE IF EXISTS pricing_rules CASCADE;
DROP TABLE IF EXISTS add_ons CASCADE;
DROP TABLE IF EXISTS blocked_dates CASCADE;

-- Create properties table (formerly event_types)
CREATE TABLE IF NOT EXISTS properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  base_nightly_rate numeric NOT NULL DEFAULT 0,
  cleaning_fee numeric NOT NULL DEFAULT 0,
  min_nights integer NOT NULL DEFAULT 1,
  max_guests integer NOT NULL DEFAULT 4,
  image_url text,
  is_active boolean NOT NULL DEFAULT true,
  theme_color text NOT NULL DEFAULT '#000000',
  email_templates jsonb NOT NULL DEFAULT '{}',
  confirmation_page jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create pricing_rules table with STR-specific fields
CREATE TABLE IF NOT EXISTS pricing_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  rule_type text NOT NULL CHECK (rule_type IN ('day_of_week', 'date_override', 'date_range')),
  day_of_week integer CHECK (day_of_week >= 0 AND day_of_week <= 6),
  specific_date date,
  start_date date,
  end_date date,
  days integer[] DEFAULT '{}',
  nightly_rate numeric NOT NULL,
  priority integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create add_ons table with per_night support
CREATE TABLE IF NOT EXISTS add_ons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  price numeric NOT NULL DEFAULT 0,
  type text NOT NULL DEFAULT 'flat' CHECK (type IN ('flat', 'per_night')),
  active boolean NOT NULL DEFAULT true,
  property_ids uuid[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create blocked_dates table (simplified for full-day blocks)
CREATE TABLE IF NOT EXISTS blocked_dates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  reason text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Update settings table with check-in/check-out times
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'settings' AND column_name = 'standard_check_in_time'
  ) THEN
    ALTER TABLE settings ADD COLUMN standard_check_in_time text NOT NULL DEFAULT '15:00';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'settings' AND column_name = 'standard_check_out_time'
  ) THEN
    ALTER TABLE settings ADD COLUMN standard_check_out_time text NOT NULL DEFAULT '11:00';
  END IF;
END $$;

-- Update company name default
UPDATE settings SET company_name = 'Luxe Rentals' WHERE id = 1 AND company_name = 'Luxe Events';
