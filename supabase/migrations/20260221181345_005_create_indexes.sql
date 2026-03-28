/*
  # Create Performance Indexes

  1. Indexes
    - bookings(date) - Calendar queries
    - bookings(status) - Filtered list queries
    - bookings(date, start_time, end_time) - Conflict detection
    - bookings(status, date, followup_email_sent) - Follow-up scheduler
    - audit_logs(entity_type, entity_id) - Entity history lookups
    - email_logs(booking_id) - Booking email history
    - rate_limits(ip_address, endpoint, window_start) - Rate limit lookups
*/

CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_conflict ON bookings(date, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_bookings_followup ON bookings(status, date, followup_email_sent);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_booking ON email_logs(booking_id);
CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup ON rate_limits(ip_address, endpoint, window_start);
