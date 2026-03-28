/*
  # Create Bookings Table

  1. New Tables
    - `bookings` - Customer booking requests
      - `id` (uuid, primary key)
      - `event_type_id` (uuid, FK to event_types)
      - `date` (date) - Event date
      - `start_time` (time) - Event start time
      - `end_time` (time) - Event end time
      - `start_date` (timestamptz) - Full start datetime
      - `end_date` (timestamptz) - Full end datetime
      - `contact_name` (text) - Customer name
      - `contact_email` (text) - Customer email
      - `contact_phone` (text) - Customer phone
      - `guest_count` (integer) - Number of guests
      - `description_of_use` (text) - How the venue will be used
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
    - Unique constraint on (date, start_time, event_type_id, contact_email) prevents duplicate submissions
    - Status constrained to valid values
    - Email status constrained to valid values
*/

CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type_id uuid NOT NULL REFERENCES event_types(id),
  date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  start_date timestamptz,
  end_date timestamptz,
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
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE bookings ADD CONSTRAINT bookings_no_duplicate
  UNIQUE (date, start_time, event_type_id, contact_email);
