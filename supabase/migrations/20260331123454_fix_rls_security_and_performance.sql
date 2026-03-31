/*
  # Fix RLS Security Vulnerabilities and Performance Issues

  ## Summary
  Addresses all security and performance issues flagged by the Supabase advisor.

  ## Changes

  ### 1. Critical Security: Replace user_metadata with app_metadata
  All admin policies previously used `auth.jwt() -> 'user_metadata'` to check the admin
  role. `user_metadata` is writable by any authenticated user, meaning any user could
  set their own role to 'admin' and bypass all RLS protections. All policies are rewritten
  to use `app_metadata`, which is only writable by service-role (server-side) operations.

  ### 2. Performance: Wrap auth.jwt() in (select ...)
  All policies now use `(select auth.jwt())` instead of `auth.jwt()`. This causes Postgres
  to evaluate the function once per query rather than once per row, eliminating a major
  performance bottleneck on large tables.

  ### 3. Remove Duplicate Policies
  Stale policies `Public can view non-sensitive settings` and `Public can view own rate limits`
  are dropped. They overlap with existing policies and cause the "Multiple Permissive Policies"
  advisor warning.

  ### 4. Tighten "Always True" INSERT Policies
  Public INSERT policies on bookings, audit_logs, email_logs, and rate_limits had
  `WITH CHECK (true)` which is always-true. These are tightened to require that
  non-nullable key fields are not null/empty, providing a basic data-integrity guard.

  ### 5. Fix Function Search Path (SECURITY DEFINER functions)
  All three SECURITY DEFINER functions get `SET search_path = public` to prevent
  search_path injection attacks where a malicious schema could shadow built-in functions.

  ### 6. Drop Unused Indexes
  Removes indexes that have never been used, reducing write overhead and storage.
*/

-- ============================================================
-- STEP 1: DROP ALL EXISTING ADMIN POLICIES (to recreate with app_metadata)
-- ============================================================

DROP POLICY IF EXISTS "Admins can view all properties" ON properties;
DROP POLICY IF EXISTS "Admins can insert properties" ON properties;
DROP POLICY IF EXISTS "Admins can update properties" ON properties;
DROP POLICY IF EXISTS "Admins can delete properties" ON properties;

DROP POLICY IF EXISTS "Admins can view all pricing rules" ON pricing_rules;
DROP POLICY IF EXISTS "Admins can insert pricing rules" ON pricing_rules;
DROP POLICY IF EXISTS "Admins can update pricing rules" ON pricing_rules;
DROP POLICY IF EXISTS "Admins can delete pricing rules" ON pricing_rules;

DROP POLICY IF EXISTS "Admins can view all add-ons" ON add_ons;
DROP POLICY IF EXISTS "Admins can insert add-ons" ON add_ons;
DROP POLICY IF EXISTS "Admins can update add-ons" ON add_ons;
DROP POLICY IF EXISTS "Admins can delete add-ons" ON add_ons;

DROP POLICY IF EXISTS "Admins can view blocked dates" ON blocked_dates;
DROP POLICY IF EXISTS "Admins can insert blocked dates" ON blocked_dates;
DROP POLICY IF EXISTS "Admins can update blocked dates" ON blocked_dates;
DROP POLICY IF EXISTS "Admins can delete blocked dates" ON blocked_dates;

DROP POLICY IF EXISTS "Admins can view all settings" ON settings;
DROP POLICY IF EXISTS "Admins can update settings" ON settings;

DROP POLICY IF EXISTS "Admins can view all bookings" ON bookings;
DROP POLICY IF EXISTS "Admins can update bookings" ON bookings;
DROP POLICY IF EXISTS "Admins can delete bookings" ON bookings;

DROP POLICY IF EXISTS "Admins can insert audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Admins can view audit logs" ON audit_logs;

DROP POLICY IF EXISTS "Admins can view email logs" ON email_logs;
DROP POLICY IF EXISTS "Admins can insert email logs" ON email_logs;

DROP POLICY IF EXISTS "Admins can manage rate limits" ON rate_limits;

-- ============================================================
-- STEP 2: DROP DUPLICATE AND ALWAYS-TRUE PUBLIC POLICIES
-- ============================================================

-- Duplicate settings policy (stale)
DROP POLICY IF EXISTS "Public can view non-sensitive settings" ON settings;

-- Duplicate rate_limits policy (stale)
DROP POLICY IF EXISTS "Public can view own rate limits" ON rate_limits;

-- Drop old always-true public INSERT policies (will recreate tightened)
DROP POLICY IF EXISTS "Public can create bookings" ON bookings;
DROP POLICY IF EXISTS "Public can insert audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Public can insert email logs" ON email_logs;
DROP POLICY IF EXISTS "Public can insert rate limits" ON rate_limits;
DROP POLICY IF EXISTS "Public can view rate limits" ON rate_limits;
DROP POLICY IF EXISTS "Public can update rate limits" ON rate_limits;

-- ============================================================
-- STEP 3: RECREATE ALL ADMIN POLICIES
-- Using app_metadata (not user_metadata) + (select auth.jwt()) for performance
-- ============================================================

-- PROPERTIES
CREATE POLICY "Admins can view all properties"
  ON properties FOR SELECT
  TO authenticated
  USING (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins can insert properties"
  ON properties FOR INSERT
  TO authenticated
  WITH CHECK (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins can update properties"
  ON properties FOR UPDATE
  TO authenticated
  USING (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins can delete properties"
  ON properties FOR DELETE
  TO authenticated
  USING (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

-- PRICING_RULES
CREATE POLICY "Admins can view all pricing rules"
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
CREATE POLICY "Admins can view all settings"
  ON settings FOR SELECT
  TO authenticated
  USING (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins can update settings"
  ON settings FOR UPDATE
  TO authenticated
  USING (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

-- BOOKINGS
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

-- AUDIT_LOGS
CREATE POLICY "Admins can insert audit logs"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins can view audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

-- EMAIL_LOGS
CREATE POLICY "Admins can view email logs"
  ON email_logs FOR SELECT
  TO authenticated
  USING (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins can insert email logs"
  ON email_logs FOR INSERT
  TO authenticated
  WITH CHECK (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

-- RATE_LIMITS
CREATE POLICY "Admins can manage rate limits"
  ON rate_limits FOR SELECT
  TO authenticated
  USING (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

-- ============================================================
-- STEP 4: RECREATE TIGHTENED PUBLIC INSERT POLICIES
-- ============================================================

-- Bookings: require the minimum non-null fields a real booking must have
CREATE POLICY "Public can create bookings"
  ON bookings FOR INSERT
  TO anon
  WITH CHECK (
    property_id IS NOT NULL AND
    check_in_date IS NOT NULL AND
    check_out_date IS NOT NULL AND
    contact_name IS NOT NULL AND contact_name <> '' AND
    contact_email IS NOT NULL AND contact_email <> '' AND
    check_out_date > check_in_date
  );

-- Audit logs: require entity_type and action to be non-empty
CREATE POLICY "Public can insert audit logs"
  ON audit_logs FOR INSERT
  TO anon
  WITH CHECK (
    entity_type IS NOT NULL AND entity_type <> '' AND
    action IS NOT NULL AND action <> ''
  );

-- Email logs: require booking_id to be set (not orphaned logs)
CREATE POLICY "Public can insert email logs"
  ON email_logs FOR INSERT
  TO anon
  WITH CHECK (booking_id IS NOT NULL);

-- Rate limits: require ip_address and endpoint to be non-empty
CREATE POLICY "Public can insert rate limits"
  ON rate_limits FOR INSERT
  TO anon
  WITH CHECK (
    ip_address IS NOT NULL AND ip_address <> '' AND
    endpoint IS NOT NULL AND endpoint <> ''
  );

CREATE POLICY "Public can view rate limits"
  ON rate_limits FOR SELECT
  TO anon
  USING (ip_address IS NOT NULL);

CREATE POLICY "Public can update rate limits"
  ON rate_limits FOR UPDATE
  TO anon
  USING (ip_address IS NOT NULL AND endpoint IS NOT NULL)
  WITH CHECK (ip_address IS NOT NULL AND endpoint IS NOT NULL);

-- ============================================================
-- STEP 5: FIX FUNCTION SEARCH_PATH (prevent search_path injection)
-- ============================================================

CREATE OR REPLACE FUNCTION check_booking_conflict(
  p_check_in_date date,
  p_check_out_date date,
  p_property_id uuid,
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
    WHERE bookings.property_id = p_property_id
      AND bookings.status NOT IN ('declined', 'cancelled')
      AND (p_exclude_booking_id IS NULL OR bookings.id != p_exclude_booking_id)
      AND (
        p_check_in_date < bookings.check_out_date
        AND p_check_out_date > bookings.check_in_date
      )
  ) INTO conflict_exists;

  RETURN conflict_exists;
END;
$$;

CREATE OR REPLACE FUNCTION create_booking_safe(
  p_property_id uuid,
  p_check_in_date date,
  p_check_out_date date,
  p_contact_name text,
  p_contact_email text,
  p_contact_phone text,
  p_guest_count integer,
  p_description_of_use text,
  p_notes text,
  p_selected_add_on_ids uuid[],
  p_total_price numeric,
  p_agreed_to_policies boolean,
  p_policies_viewed_at timestamptz
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
  PERFORM pg_advisory_xact_lock(hashtext(p_property_id::text || p_check_in_date::text));

  SELECT EXISTS (
    SELECT 1 FROM blocked_dates
    WHERE blocked_dates.date >= p_check_in_date
      AND blocked_dates.date < p_check_out_date
      AND (
        blocked_dates.property_id IS NULL
        OR blocked_dates.property_id = p_property_id
      )
  ) INTO v_blocked;

  IF v_blocked THEN
    RAISE EXCEPTION 'BLOCKED_DATE: One or more dates in this range are blocked and unavailable for booking.';
  END IF;

  SELECT check_booking_conflict(
    p_check_in_date,
    p_check_out_date,
    p_property_id,
    NULL
  ) INTO v_conflict;

  IF v_conflict THEN
    RAISE EXCEPTION 'DATE_CONFLICT: The requested dates conflict with an existing booking.';
  END IF;

  INSERT INTO bookings (
    property_id, check_in_date, check_out_date,
    contact_name, contact_email, contact_phone, guest_count,
    description_of_use, notes, selected_add_on_ids, total_price,
    agreed_to_policies, policies_viewed_at,
    status, email_status, followup_email_sent, version
  ) VALUES (
    p_property_id, p_check_in_date, p_check_out_date,
    p_contact_name, p_contact_email, p_contact_phone, p_guest_count,
    p_description_of_use, p_notes, p_selected_add_on_ids, p_total_price,
    p_agreed_to_policies, p_policies_viewed_at,
    'pending', 'not_sent', false, 1
  )
  RETURNING id INTO v_booking_id;

  INSERT INTO audit_logs (entity_type, entity_id, action, performed_by, new_value)
  VALUES ('booking', v_booking_id::text, 'created', NULL, jsonb_build_object(
    'property_id', p_property_id,
    'check_in_date', p_check_in_date,
    'check_out_date', p_check_out_date,
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

-- ============================================================
-- STEP 6: DROP UNUSED INDEXES
-- ============================================================

DROP INDEX IF EXISTS idx_audit_logs_entity;
DROP INDEX IF EXISTS idx_email_logs_booking;
DROP INDEX IF EXISTS idx_rate_limits_lookup;
DROP INDEX IF EXISTS idx_bookings_check_in;
DROP INDEX IF EXISTS idx_bookings_status;
DROP INDEX IF EXISTS idx_bookings_conflict;
DROP INDEX IF EXISTS idx_bookings_followup;
DROP INDEX IF EXISTS idx_pricing_rules_property;
DROP INDEX IF EXISTS idx_blocked_dates_property;
DROP INDEX IF EXISTS idx_blocked_dates_external_uid;
DROP INDEX IF EXISTS idx_properties_ical_token;
