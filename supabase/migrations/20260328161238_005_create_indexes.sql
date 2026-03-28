/*
  # Create Performance Indexes for Short-Term Rentals

  1. Indexes
    - bookings(check_in_date) - Calendar queries
    - bookings(status) - Filtered list queries
    - bookings(property_id, check_in_date, check_out_date) - Conflict detection
    - bookings(status, check_in_date, followup_email_sent) - Follow-up scheduler
    - pricing_rules(property_id, rule_type, is_active) - Pricing lookups
    - blocked_dates(property_id, date) - Availability checks
    - audit_logs(entity_type, entity_id) - Entity history lookups
    - email_logs(booking_id) - Booking email history
    - rate_limits(ip_address, endpoint, window_start) - Rate limit lookups
*/

-- Drop old indexes
DROP INDEX IF EXISTS idx_bookings_date;
DROP INDEX IF EXISTS idx_bookings_conflict;
DROP INDEX IF EXISTS idx_bookings_followup;

-- Create new indexes for date-based bookings
CREATE INDEX IF NOT EXISTS idx_bookings_check_in ON bookings(check_in_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_conflict ON bookings(property_id, check_in_date, check_out_date);
CREATE INDEX IF NOT EXISTS idx_bookings_followup ON bookings(status, check_in_date, followup_email_sent);

-- Create indexes for pricing rules
CREATE INDEX IF NOT EXISTS idx_pricing_rules_property ON pricing_rules(property_id, rule_type, is_active);

-- Create index for blocked dates
CREATE INDEX IF NOT EXISTS idx_blocked_dates_property ON blocked_dates(property_id, date);

-- Keep existing indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_booking ON email_logs(booking_id);
CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup ON rate_limits(ip_address, endpoint, window_start);
