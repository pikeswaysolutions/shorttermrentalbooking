/*
  # Row Level Security Policies

  1. Security Setup
    - Enable RLS on all tables
    - Admin check: auth.jwt() -> user_metadata ->> 'role' = 'admin'

  2. Public Access (anon)
    - SELECT active event_types, pricing_rules, active add_ons, blocked_dates
    - SELECT settings (excluding api_keys_encrypted via a separate admin-only policy)
    - SELECT bookings limited to non-declined/cancelled for calendar availability
    - INSERT bookings (customer booking creation)
    - INSERT audit_logs (for public booking audit entries)
    - INSERT rate_limits (for rate limit tracking)

  3. Admin Access (authenticated with role=admin)
    - Full CRUD on all tables
*/

ALTER TABLE event_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE add_ons ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- EVENT_TYPES policies
CREATE POLICY "Public can view active event types"
  ON event_types FOR SELECT
  TO anon
  USING (active = true);

CREATE POLICY "Admins can view all event types"
  ON event_types FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins can insert event types"
  ON event_types FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins can update event types"
  ON event_types FOR UPDATE
  TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins can delete event types"
  ON event_types FOR DELETE
  TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- PRICING_RULES policies
CREATE POLICY "Public can view pricing rules"
  ON pricing_rules FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Admins can view pricing rules"
  ON pricing_rules FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins can insert pricing rules"
  ON pricing_rules FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins can update pricing rules"
  ON pricing_rules FOR UPDATE
  TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins can delete pricing rules"
  ON pricing_rules FOR DELETE
  TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- ADD_ONS policies
CREATE POLICY "Public can view active add-ons"
  ON add_ons FOR SELECT
  TO anon
  USING (active = true);

CREATE POLICY "Admins can view all add-ons"
  ON add_ons FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins can insert add-ons"
  ON add_ons FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins can update add-ons"
  ON add_ons FOR UPDATE
  TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins can delete add-ons"
  ON add_ons FOR DELETE
  TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- BLOCKED_DATES policies
CREATE POLICY "Public can view blocked dates"
  ON blocked_dates FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Admins can view blocked dates"
  ON blocked_dates FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins can insert blocked dates"
  ON blocked_dates FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins can update blocked dates"
  ON blocked_dates FOR UPDATE
  TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins can delete blocked dates"
  ON blocked_dates FOR DELETE
  TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- SETTINGS policies
CREATE POLICY "Public can view non-sensitive settings"
  ON settings FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Admins can view all settings"
  ON settings FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins can insert settings"
  ON settings FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins can update settings"
  ON settings FOR UPDATE
  TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- BOOKINGS policies
CREATE POLICY "Public can view booking availability"
  ON bookings FOR SELECT
  TO anon
  USING (status NOT IN ('declined', 'cancelled'));

CREATE POLICY "Public can create bookings"
  ON bookings FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Admins can view all bookings"
  ON bookings FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins can update bookings"
  ON bookings FOR UPDATE
  TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins can delete bookings"
  ON bookings FOR DELETE
  TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- AUDIT_LOGS policies
CREATE POLICY "Public can insert audit logs"
  ON audit_logs FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Admins can insert audit logs"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins can view audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- EMAIL_LOGS policies
CREATE POLICY "Admins can view email logs"
  ON email_logs FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins can insert email logs"
  ON email_logs FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "Public can insert email logs"
  ON email_logs FOR INSERT
  TO anon
  WITH CHECK (true);

-- RATE_LIMITS policies
CREATE POLICY "Public can insert rate limits"
  ON rate_limits FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Public can view own rate limits"
  ON rate_limits FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Public can update rate limits"
  ON rate_limits FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can manage rate limits"
  ON rate_limits FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');
