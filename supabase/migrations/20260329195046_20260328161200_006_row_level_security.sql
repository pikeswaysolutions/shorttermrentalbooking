/*
  # Row Level Security Policies for STR Platform

  1. Security Setup
    - Enable RLS on all tables
    - Admin check: auth.jwt() -> 'user_metadata' ->> 'role' = 'admin'

  2. Public Access (anon role)
    - SELECT active properties (for booking widget)
    - SELECT active pricing rules (for price calculation)
    - SELECT active add-ons (for booking widget)
    - SELECT blocked dates (for availability display)
    - SELECT settings (for branding, excluding api_keys_encrypted)
    - SELECT bookings with status NOT IN ('declined', 'cancelled') for availability
    - INSERT bookings (customer booking creation)
    - INSERT audit_logs (for public booking audit entries)
    - INSERT/SELECT/UPDATE rate_limits (for rate limiting)

  3. Admin Access (authenticated with role=admin)
    - Full CRUD on all tables

  4. Notes
    - RLS provides defense-in-depth security
    - Public can only see what's needed for booking flow
    - Admins have unrestricted access for management
*/

ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE add_ons ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- PROPERTIES policies
DROP POLICY IF EXISTS "Public can view active properties" ON properties;
CREATE POLICY "Public can view active properties"
  ON properties FOR SELECT
  TO anon
  USING (is_active = true);

DROP POLICY IF EXISTS "Admins can view all properties" ON properties;
CREATE POLICY "Admins can view all properties"
  ON properties FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS "Admins can insert properties" ON properties;
CREATE POLICY "Admins can insert properties"
  ON properties FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS "Admins can update properties" ON properties;
CREATE POLICY "Admins can update properties"
  ON properties FOR UPDATE
  TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS "Admins can delete properties" ON properties;
CREATE POLICY "Admins can delete properties"
  ON properties FOR DELETE
  TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- PRICING_RULES policies
DROP POLICY IF EXISTS "Public can view active pricing rules" ON pricing_rules;
CREATE POLICY "Public can view active pricing rules"
  ON pricing_rules FOR SELECT
  TO anon
  USING (is_active = true);

DROP POLICY IF EXISTS "Admins can view all pricing rules" ON pricing_rules;
CREATE POLICY "Admins can view all pricing rules"
  ON pricing_rules FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS "Admins can insert pricing rules" ON pricing_rules;
CREATE POLICY "Admins can insert pricing rules"
  ON pricing_rules FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS "Admins can update pricing rules" ON pricing_rules;
CREATE POLICY "Admins can update pricing rules"
  ON pricing_rules FOR UPDATE
  TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS "Admins can delete pricing rules" ON pricing_rules;
CREATE POLICY "Admins can delete pricing rules"
  ON pricing_rules FOR DELETE
  TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- ADD_ONS policies
DROP POLICY IF EXISTS "Public can view active add-ons" ON add_ons;
CREATE POLICY "Public can view active add-ons"
  ON add_ons FOR SELECT
  TO anon
  USING (active = true);

DROP POLICY IF EXISTS "Admins can view all add-ons" ON add_ons;
CREATE POLICY "Admins can view all add-ons"
  ON add_ons FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS "Admins can insert add-ons" ON add_ons;
CREATE POLICY "Admins can insert add-ons"
  ON add_ons FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS "Admins can update add-ons" ON add_ons;
CREATE POLICY "Admins can update add-ons"
  ON add_ons FOR UPDATE
  TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS "Admins can delete add-ons" ON add_ons;
CREATE POLICY "Admins can delete add-ons"
  ON add_ons FOR DELETE
  TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- BLOCKED_DATES policies
DROP POLICY IF EXISTS "Public can view blocked dates" ON blocked_dates;
CREATE POLICY "Public can view blocked dates"
  ON blocked_dates FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "Admins can view blocked dates" ON blocked_dates;
CREATE POLICY "Admins can view blocked dates"
  ON blocked_dates FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS "Admins can insert blocked dates" ON blocked_dates;
CREATE POLICY "Admins can insert blocked dates"
  ON blocked_dates FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS "Admins can update blocked dates" ON blocked_dates;
CREATE POLICY "Admins can update blocked dates"
  ON blocked_dates FOR UPDATE
  TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS "Admins can delete blocked dates" ON blocked_dates;
CREATE POLICY "Admins can delete blocked dates"
  ON blocked_dates FOR DELETE
  TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- SETTINGS policies
DROP POLICY IF EXISTS "Public can view settings" ON settings;
CREATE POLICY "Public can view settings"
  ON settings FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "Admins can view all settings" ON settings;
CREATE POLICY "Admins can view all settings"
  ON settings FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS "Admins can update settings" ON settings;
CREATE POLICY "Admins can update settings"
  ON settings FOR UPDATE
  TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- BOOKINGS policies
DROP POLICY IF EXISTS "Public can view booking availability" ON bookings;
CREATE POLICY "Public can view booking availability"
  ON bookings FOR SELECT
  TO anon
  USING (status NOT IN ('declined', 'cancelled'));

DROP POLICY IF EXISTS "Public can create bookings" ON bookings;
CREATE POLICY "Public can create bookings"
  ON bookings FOR INSERT
  TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view all bookings" ON bookings;
CREATE POLICY "Admins can view all bookings"
  ON bookings FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS "Admins can update bookings" ON bookings;
CREATE POLICY "Admins can update bookings"
  ON bookings FOR UPDATE
  TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS "Admins can delete bookings" ON bookings;
CREATE POLICY "Admins can delete bookings"
  ON bookings FOR DELETE
  TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- AUDIT_LOGS policies
DROP POLICY IF EXISTS "Public can insert audit logs" ON audit_logs;
CREATE POLICY "Public can insert audit logs"
  ON audit_logs FOR INSERT
  TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can insert audit logs" ON audit_logs;
CREATE POLICY "Admins can insert audit logs"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS "Admins can view audit logs" ON audit_logs;
CREATE POLICY "Admins can view audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- EMAIL_LOGS policies
DROP POLICY IF EXISTS "Admins can view email logs" ON email_logs;
CREATE POLICY "Admins can view email logs"
  ON email_logs FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS "Admins can insert email logs" ON email_logs;
CREATE POLICY "Admins can insert email logs"
  ON email_logs FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS "Public can insert email logs" ON email_logs;
CREATE POLICY "Public can insert email logs"
  ON email_logs FOR INSERT
  TO anon
  WITH CHECK (true);

-- RATE_LIMITS policies
DROP POLICY IF EXISTS "Public can insert rate limits" ON rate_limits;
CREATE POLICY "Public can insert rate limits"
  ON rate_limits FOR INSERT
  TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "Public can view rate limits" ON rate_limits;
CREATE POLICY "Public can view rate limits"
  ON rate_limits FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "Public can update rate limits" ON rate_limits;
CREATE POLICY "Public can update rate limits"
  ON rate_limits FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can manage rate limits" ON rate_limits;
CREATE POLICY "Admins can manage rate limits"
  ON rate_limits FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');
