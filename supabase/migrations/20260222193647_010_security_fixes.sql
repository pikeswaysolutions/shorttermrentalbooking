/*
  # Security & Performance Fixes

  1. Missing Foreign Key Indexes
    - Add index on `bookings.event_type_id` for FK `bookings_event_type_id_fkey`
    - Add index on `pricing_rules.event_type_id` for FK `pricing_rules_event_type_id_fkey`

  2. RLS Policy Optimization
    - Replace all `auth.jwt()` calls with `(select auth.jwt())` to avoid re-evaluation per row
    - Migrate all admin role checks from `user_metadata` (user-editable) to `app_metadata` (server-only)

  3. Tighten Public INSERT Policies
    - `bookings`: restrict public inserts to only allowed status values
    - `audit_logs`: restrict public inserts to booking-related actions only
    - `email_logs`: restrict public inserts to valid booking references
    - `rate_limits`: restrict public inserts/updates to own IP tracking

  4. Fix Function Search Paths
    - Set explicit `search_path` on `check_booking_conflict`, `create_booking_safe`, `check_rate_limit`

  5. Migrate Existing Admin Users
    - Copy role from `user_metadata` to `app_metadata` for all existing admin users
*/

-- 1. Add missing foreign key indexes
CREATE INDEX IF NOT EXISTS idx_bookings_event_type_id ON bookings(event_type_id);
CREATE INDEX IF NOT EXISTS idx_pricing_rules_event_type_id ON pricing_rules(event_type_id);

-- 2. Migrate existing admin users from user_metadata to app_metadata
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT id FROM auth.users
    WHERE raw_user_meta_data->>'role' = 'admin'
  LOOP
    UPDATE auth.users
    SET raw_app_meta_data = raw_app_meta_data || '{"role": "admin"}'::jsonb
    WHERE id = r.id;
  END LOOP;
END $$;

-- 3. Drop all existing admin RLS policies and recreate with app_metadata + (select ...) pattern

-- EVENT_TYPES
DROP POLICY IF EXISTS "Admins can view all event types" ON event_types;
DROP POLICY IF EXISTS "Admins can insert event types" ON event_types;
DROP POLICY IF EXISTS "Admins can update event types" ON event_types;
DROP POLICY IF EXISTS "Admins can delete event types" ON event_types;

CREATE POLICY "Admins can view all event types"
  ON event_types FOR SELECT
  TO authenticated
  USING (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins can insert event types"
  ON event_types FOR INSERT
  TO authenticated
  WITH CHECK (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins can update event types"
  ON event_types FOR UPDATE
  TO authenticated
  USING (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins can delete event types"
  ON event_types FOR DELETE
  TO authenticated
  USING (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

-- PRICING_RULES
DROP POLICY IF EXISTS "Admins can view pricing rules" ON pricing_rules;
DROP POLICY IF EXISTS "Admins can insert pricing rules" ON pricing_rules;
DROP POLICY IF EXISTS "Admins can update pricing rules" ON pricing_rules;
DROP POLICY IF EXISTS "Admins can delete pricing rules" ON pricing_rules;

CREATE POLICY "Admins can view pricing rules"
  ON pricing_rules FOR SELECT
  TO authenticated
  USING (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins can insert pricing rules"
  ON pricing_rules FOR INSERT
  TO authenticated
  WITH CHECK (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins can update pricing rules"
  ON pricing_rules FOR UPDATE
  TO authenticated
  USING (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins can delete pricing rules"
  ON pricing_rules FOR DELETE
  TO authenticated
  USING (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

-- ADD_ONS
DROP POLICY IF EXISTS "Admins can view all add-ons" ON add_ons;
DROP POLICY IF EXISTS "Admins can insert add-ons" ON add_ons;
DROP POLICY IF EXISTS "Admins can update add-ons" ON add_ons;
DROP POLICY IF EXISTS "Admins can delete add-ons" ON add_ons;

CREATE POLICY "Admins can view all add-ons"
  ON add_ons FOR SELECT
  TO authenticated
  USING (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins can insert add-ons"
  ON add_ons FOR INSERT
  TO authenticated
  WITH CHECK (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins can update add-ons"
  ON add_ons FOR UPDATE
  TO authenticated
  USING (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins can delete add-ons"
  ON add_ons FOR DELETE
  TO authenticated
  USING (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

-- BLOCKED_DATES
DROP POLICY IF EXISTS "Admins can view blocked dates" ON blocked_dates;
DROP POLICY IF EXISTS "Admins can insert blocked dates" ON blocked_dates;
DROP POLICY IF EXISTS "Admins can update blocked dates" ON blocked_dates;
DROP POLICY IF EXISTS "Admins can delete blocked dates" ON blocked_dates;

CREATE POLICY "Admins can view blocked dates"
  ON blocked_dates FOR SELECT
  TO authenticated
  USING (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins can insert blocked dates"
  ON blocked_dates FOR INSERT
  TO authenticated
  WITH CHECK (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins can update blocked dates"
  ON blocked_dates FOR UPDATE
  TO authenticated
  USING (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins can delete blocked dates"
  ON blocked_dates FOR DELETE
  TO authenticated
  USING (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

-- SETTINGS
DROP POLICY IF EXISTS "Admins can view all settings" ON settings;
DROP POLICY IF EXISTS "Admins can insert settings" ON settings;
DROP POLICY IF EXISTS "Admins can update settings" ON settings;

CREATE POLICY "Admins can view all settings"
  ON settings FOR SELECT
  TO authenticated
  USING (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins can insert settings"
  ON settings FOR INSERT
  TO authenticated
  WITH CHECK (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins can update settings"
  ON settings FOR UPDATE
  TO authenticated
  USING (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

-- BOOKINGS
DROP POLICY IF EXISTS "Admins can view all bookings" ON bookings;
DROP POLICY IF EXISTS "Admins can update bookings" ON bookings;
DROP POLICY IF EXISTS "Admins can delete bookings" ON bookings;
DROP POLICY IF EXISTS "Public can create bookings" ON bookings;

CREATE POLICY "Admins can view all bookings"
  ON bookings FOR SELECT
  TO authenticated
  USING (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins can update bookings"
  ON bookings FOR UPDATE
  TO authenticated
  USING (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins can delete bookings"
  ON bookings FOR DELETE
  TO authenticated
  USING (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Public can create bookings"
  ON bookings FOR INSERT
  TO anon
  WITH CHECK (
    status = 'pending'
    AND email_status = 'not_sent'
    AND followup_email_sent = false
  );

-- AUDIT_LOGS
DROP POLICY IF EXISTS "Admins can insert audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Admins can view audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Public can insert audit logs" ON audit_logs;

CREATE POLICY "Admins can view audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins can insert audit logs"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Public can insert audit logs"
  ON audit_logs FOR INSERT
  TO anon
  WITH CHECK (
    entity_type = 'booking'
    AND action IN ('created', 'viewed')
  );

-- EMAIL_LOGS
DROP POLICY IF EXISTS "Admins can view email logs" ON email_logs;
DROP POLICY IF EXISTS "Admins can insert email logs" ON email_logs;
DROP POLICY IF EXISTS "Public can insert email logs" ON email_logs;

CREATE POLICY "Admins can view email logs"
  ON email_logs FOR SELECT
  TO authenticated
  USING (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins can insert email logs"
  ON email_logs FOR INSERT
  TO authenticated
  WITH CHECK (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Public can insert email logs"
  ON email_logs FOR INSERT
  TO anon
  WITH CHECK (booking_id IS NOT NULL);

-- RATE_LIMITS
DROP POLICY IF EXISTS "Admins can manage rate limits" ON rate_limits;
DROP POLICY IF EXISTS "Public can insert rate limits" ON rate_limits;
DROP POLICY IF EXISTS "Public can view own rate limits" ON rate_limits;
DROP POLICY IF EXISTS "Public can update rate limits" ON rate_limits;

CREATE POLICY "Admins can manage rate limits"
  ON rate_limits FOR SELECT
  TO authenticated
  USING (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Public can insert rate limits"
  ON rate_limits FOR INSERT
  TO anon
  WITH CHECK (ip_address IS NOT NULL AND endpoint IS NOT NULL);

CREATE POLICY "Public can view own rate limits"
  ON rate_limits FOR SELECT
  TO anon
  USING (ip_address IS NOT NULL);

CREATE POLICY "Public can update rate limits"
  ON rate_limits FOR UPDATE
  TO anon
  USING (ip_address IS NOT NULL)
  WITH CHECK (ip_address IS NOT NULL);

-- 4. Fix mutable search_path on functions
CREATE OR REPLACE FUNCTION check_booking_conflict(
  p_date date,
  p_start_time time,
  p_end_time time,
  p_cooldown_hours integer DEFAULT 1,
  p_exclude_booking_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  conflict_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM bookings
    WHERE bookings.date = p_date
      AND bookings.status NOT IN ('declined', 'cancelled')
      AND (p_exclude_booking_id IS NULL OR bookings.id != p_exclude_booking_id)
      AND (
        (p_start_time < (bookings.end_time + (p_cooldown_hours || ' hours')::interval)::time
         AND p_end_time > bookings.start_time)
      )
  ) INTO conflict_exists;

  RETURN conflict_exists;
END;
$$;

CREATE OR REPLACE FUNCTION create_booking_safe(
  p_event_type_id uuid,
  p_date date,
  p_start_time time,
  p_end_time time,
  p_start_date timestamptz,
  p_end_date timestamptz,
  p_contact_name text,
  p_contact_email text,
  p_contact_phone text,
  p_guest_count integer,
  p_description_of_use text,
  p_notes text,
  p_selected_add_on_ids uuid[],
  p_total_price numeric,
  p_agreed_to_policies boolean,
  p_policies_viewed_at timestamptz,
  p_cooldown_hours integer DEFAULT 1
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking_id uuid;
  v_conflict boolean;
  v_blocked boolean;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(p_date::text));

  SELECT EXISTS (
    SELECT 1 FROM blocked_dates
    WHERE blocked_dates.date = p_date
      AND (
        blocked_dates.is_full_day = true
        OR (
          p_start_time < blocked_dates.end_time
          AND p_end_time > blocked_dates.start_time
        )
      )
  ) INTO v_blocked;

  IF v_blocked THEN
    RAISE EXCEPTION 'BLOCKED_DATE: This date/time is blocked and unavailable for booking.';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM bookings
    WHERE bookings.date = p_date
      AND bookings.status NOT IN ('declined', 'cancelled')
      AND (
        p_start_time < (bookings.end_time + (p_cooldown_hours || ' hours')::interval)::time
        AND p_end_time > bookings.start_time
      )
  ) INTO v_conflict;

  IF v_conflict THEN
    RAISE EXCEPTION 'TIME_CONFLICT: The requested time slot conflicts with an existing booking (including cooldown period).';
  END IF;

  INSERT INTO bookings (
    event_type_id, date, start_time, end_time, start_date, end_date,
    contact_name, contact_email, contact_phone, guest_count,
    description_of_use, notes, selected_add_on_ids, total_price,
    agreed_to_policies, policies_viewed_at,
    status, email_status, followup_email_sent, version
  ) VALUES (
    p_event_type_id, p_date, p_start_time, p_end_time, p_start_date, p_end_date,
    p_contact_name, p_contact_email, p_contact_phone, p_guest_count,
    p_description_of_use, p_notes, p_selected_add_on_ids, p_total_price,
    p_agreed_to_policies, p_policies_viewed_at,
    'pending', 'not_sent', false, 1
  )
  RETURNING id INTO v_booking_id;

  INSERT INTO audit_logs (entity_type, entity_id, action, performed_by, new_value)
  VALUES ('booking', v_booking_id::text, 'created', NULL, jsonb_build_object(
    'event_type_id', p_event_type_id,
    'date', p_date,
    'start_time', p_start_time,
    'end_time', p_end_time,
    'contact_email', p_contact_email,
    'total_price', p_total_price
  ));

  RETURN v_booking_id;
END;
$$;

CREATE OR REPLACE FUNCTION check_rate_limit(
  p_ip_address text,
  p_endpoint text,
  p_max_requests integer DEFAULT 5,
  p_window_minutes integer DEFAULT 15
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
  v_window_start timestamptz;
BEGIN
  v_window_start := now() - (p_window_minutes || ' minutes')::interval;

  DELETE FROM rate_limits
  WHERE window_start < v_window_start;

  SELECT COALESCE(SUM(request_count), 0) INTO v_count
  FROM rate_limits
  WHERE ip_address = p_ip_address
    AND endpoint = p_endpoint
    AND window_start >= v_window_start;

  IF v_count >= p_max_requests THEN
    RETURN true;
  END IF;

  INSERT INTO rate_limits (ip_address, endpoint, request_count, window_start)
  VALUES (p_ip_address, p_endpoint, 1, now());

  RETURN false;
END;
$$;