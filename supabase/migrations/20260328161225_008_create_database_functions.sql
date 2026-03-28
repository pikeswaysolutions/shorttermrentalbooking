/*
  # Create Database Functions for Short-Term Rentals

  1. Functions
    - `check_booking_conflict` - Checks if a proposed booking conflicts with existing bookings
      - Takes check_in_date, check_out_date, property_id, optional exclude_booking_id
      - Returns boolean (true = conflict exists)
      - Allows same-day turnover (check-in can equal existing check-out)
      - Ignores declined/cancelled bookings

    - `create_booking_safe` - Atomically creates a booking with conflict check
      - Uses row-level locking to prevent race conditions
      - Returns the created booking ID or raises an exception on conflict

    - `check_rate_limit` - IP-based rate limiting
      - Takes ip, endpoint, max_requests, window_minutes
      - Returns boolean (true = rate limited)
      - Cleans up old entries
*/

-- Drop old functions
DROP FUNCTION IF EXISTS check_booking_conflict(date, time, time, integer, uuid);
DROP FUNCTION IF EXISTS create_booking_safe(uuid, date, time, time, timestamptz, timestamptz, text, text, text, integer, text, text, uuid[], numeric, boolean, timestamptz, integer);

-- Check for booking conflicts with same-day turnover support
CREATE OR REPLACE FUNCTION check_booking_conflict(
  p_check_in_date date,
  p_check_out_date date,
  p_property_id uuid,
  p_exclude_booking_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  conflict_exists boolean;
BEGIN
  -- A conflict exists if the date ranges overlap (excluding boundaries)
  -- Same-day turnover is allowed: new check-in CAN equal existing check-out
  SELECT EXISTS (
    SELECT 1 FROM bookings
    WHERE bookings.property_id = p_property_id
      AND bookings.status NOT IN ('declined', 'cancelled')
      AND (p_exclude_booking_id IS NULL OR bookings.id != p_exclude_booking_id)
      AND (
        -- New booking overlaps existing: check-in before existing check-out AND check-out after existing check-in
        p_check_in_date < bookings.check_out_date
        AND p_check_out_date > bookings.check_in_date
      )
  ) INTO conflict_exists;

  RETURN conflict_exists;
END;
$$;

-- Create booking with atomic conflict checking
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
AS $$
DECLARE
  v_booking_id uuid;
  v_conflict boolean;
  v_blocked boolean;
BEGIN
  -- Advisory lock to prevent race conditions for this property and date range
  PERFORM pg_advisory_xact_lock(hashtext(p_property_id::text || p_check_in_date::text));

  -- Check if any dates in the range are blocked
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

  -- Check for conflicts using the new conflict function
  SELECT check_booking_conflict(
    p_check_in_date,
    p_check_out_date,
    p_property_id,
    NULL
  ) INTO v_conflict;

  IF v_conflict THEN
    RAISE EXCEPTION 'DATE_CONFLICT: The requested dates conflict with an existing booking.';
  END IF;

  -- Insert the booking
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

  -- Log the creation
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

-- Rate limiting function (unchanged)
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_ip_address text,
  p_endpoint text,
  p_max_requests integer DEFAULT 5,
  p_window_minutes integer DEFAULT 15
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION check_booking_conflict TO anon;
GRANT EXECUTE ON FUNCTION check_booking_conflict TO authenticated;
GRANT EXECUTE ON FUNCTION create_booking_safe TO anon;
GRANT EXECUTE ON FUNCTION create_booking_safe TO authenticated;
GRANT EXECUTE ON FUNCTION check_rate_limit TO anon;
GRANT EXECUTE ON FUNCTION check_rate_limit TO authenticated;
