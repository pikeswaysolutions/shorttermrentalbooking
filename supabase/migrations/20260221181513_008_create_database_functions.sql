/*
  # Create Database Functions

  1. Functions
    - `check_booking_conflict` - Checks if a proposed booking conflicts with existing bookings
      - Takes date, start_time, end_time, cooldown_hours, optional exclude_booking_id
      - Returns boolean (true = conflict exists)
      - Considers cooldown period after each existing booking
      - Ignores declined/cancelled bookings

    - `create_booking_safe` - Atomically creates a booking with conflict check
      - Uses row-level locking to prevent race conditions
      - Returns the created booking or raises an exception on conflict

    - `check_rate_limit` - IP-based rate limiting
      - Takes ip, endpoint, max_requests, window_minutes
      - Returns boolean (true = rate limited)
      - Cleans up old entries
*/

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

GRANT EXECUTE ON FUNCTION check_booking_conflict TO anon;
GRANT EXECUTE ON FUNCTION check_booking_conflict TO authenticated;
GRANT EXECUTE ON FUNCTION create_booking_safe TO anon;
GRANT EXECUTE ON FUNCTION create_booking_safe TO authenticated;
GRANT EXECUTE ON FUNCTION check_rate_limit TO anon;
GRANT EXECUTE ON FUNCTION check_rate_limit TO authenticated;
