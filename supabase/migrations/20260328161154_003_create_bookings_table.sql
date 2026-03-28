/*
  # Create Bookings Table for Short-Term Rentals

  1. New Tables
    - `bookings` - Customer rental reservations
      - `id` (uuid, primary key)
      - `property_id` (uuid, FK to properties)
      - `check_in_date` (date) - Check-in date
      - `check_out_date` (date) - Check-out date
      - `contact_name` (text) - Customer name
      - `contact_email` (text) - Customer email
      - `contact_phone` (text) - Customer phone
      - `guest_count` (integer) - Number of guests
      - `description_of_use` (text) - Purpose of rental
      - `notes` (text) - Additional notes
      - `selected_add_on_ids` (uuid[]) - Selected add-on IDs
      - `total_price` (numeric) - Server-calculated total price
      - `status` (text) - pending/confirmed/declined/cancelled
      - `agreed_to_policies` (boolean) - Customer agreed to policies
      - `policies_viewed_at` (timestamptz) - When policies were viewed
      - `email_status` (text) - not_sent/sent/failed
      - `followup_email_sent` (boolean) - Whether follow-up was sent
      - `version` (integer) - Optimistic locking version
      - `created_at`, `updated_at` (timestamptz)

  2. Constraints
    - Check-out date must be after check-in date
    - Unique constraint on (check_in_date, property_id, contact_email) prevents duplicate submissions
    - Status constrained to valid values
    - Email status constrained to valid values
*/

-- Drop old bookings table
DROP TABLE IF EXISTS bookings CASCADE;

-- Create new bookings table with date-based fields
CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id),
  check_in_date date NOT NULL,
  check_out_date date NOT NULL,
  contact_name text NOT NULL,
  contact_email text NOT NULL,
  contact_phone text NOT NULL,
  guest_count integer NOT NULL DEFAULT 1,
  description_of_use text NOT NULL DEFAULT '',
  notes text,
  selected_add_on_ids uuid[] NOT NULL DEFAULT '{}',
  total_price numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'declined', 'cancelled')),
  agreed_to_policies boolean NOT NULL DEFAULT false,
  policies_viewed_at timestamptz,
  email_status text NOT NULL DEFAULT 'not_sent' CHECK (email_status IN ('not_sent', 'sent', 'failed')),
  followup_email_sent boolean NOT NULL DEFAULT false,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bookings_valid_dates CHECK (check_out_date > check_in_date)
);

-- Add unique constraint to prevent duplicate submissions
CREATE UNIQUE INDEX IF NOT EXISTS bookings_no_duplicate 
  ON bookings(check_in_date, property_id, contact_email);
