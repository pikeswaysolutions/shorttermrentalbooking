/*
  # Seed Initial Data for Short-Term Rental Platform

  1. Properties (3)
    - Cozy Downtown Loft ($150/night, $75 cleaning, min 2 nights)
    - Beachfront Villa ($300/night, $150 cleaning, min 3 nights)
    - Mountain Cabin Retreat ($200/night, $100 cleaning, min 1 night)

  2. Pricing Rules (3)
    - Weekend Premium: Fridays and Saturdays +$50 (day_of_week, priority 10)
    - Summer Season: June-Aug for Beachfront Villa $400/night (date_range, priority 20)
    - New Year's Eve: Dec 31 special rate $500/night (date_override, priority 30)

  3. Add-ons (3)
    - Early Check-in ($50 flat)
    - Late Check-out ($50 flat)
    - Pet Fee ($25 per night)

  4. Default Settings
    - Company: Luxe Rentals
    - Check-in: 3:00 PM, Check-out: 11:00 AM
*/

-- Insert properties (using Unsplash images)
INSERT INTO properties (id, name, description, base_nightly_rate, cleaning_fee, min_nights, max_guests, image_url, is_active, theme_color, email_templates, confirmation_page)
VALUES
  (
    'a0000000-0000-0000-0000-000000000001',
    'Cozy Downtown Loft',
    'Modern loft apartment in the heart of downtown with stunning city views, exposed brick walls, and contemporary furnishings. Perfect for business travelers or couples.',
    150, 75, 2, 4,
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
    true, '#3b82f6',
    '{"confirmationAlias": "", "followupAlias": "", "followupDaysBefore": 3}',
    '{}'
  ),
  (
    'a0000000-0000-0000-0000-000000000002',
    'Beachfront Villa',
    'Luxurious beachfront villa with private beach access, infinity pool, and panoramic ocean views. Spacious outdoor deck perfect for entertaining.',
    300, 150, 3, 8,
    'https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=800',
    true, '#10b981',
    '{"confirmationAlias": "", "followupAlias": "", "followupDaysBefore": 5}',
    '{}'
  ),
  (
    'a0000000-0000-0000-0000-000000000003',
    'Mountain Cabin Retreat',
    'Peaceful cabin surrounded by nature with mountain views, cozy fireplace, and hot tub on the deck. Ideal for a quiet getaway.',
    200, 100, 1, 6,
    'https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=800',
    true, '#f59e0b',
    '{"confirmationAlias": "", "followupAlias": "", "followupDaysBefore": 3}',
    '{}'
  )
ON CONFLICT (id) DO NOTHING;

-- Insert pricing rules
INSERT INTO pricing_rules (name, property_id, rule_type, days, nightly_rate, priority, is_active)
VALUES
  -- Weekend premium (applies to all properties on Fridays and Saturdays)
  ('Weekend Premium - Downtown Loft', 'a0000000-0000-0000-0000-000000000001', 'day_of_week', '{5,6}', 200, 10, true),
  ('Weekend Premium - Beachfront Villa', 'a0000000-0000-0000-0000-000000000002', 'day_of_week', '{5,6}', 400, 10, true),
  ('Weekend Premium - Mountain Cabin', 'a0000000-0000-0000-0000-000000000003', 'day_of_week', '{5,6}', 250, 10, true);

-- Insert date range rule for summer season (Beachfront Villa only)
INSERT INTO pricing_rules (name, property_id, rule_type, start_date, end_date, nightly_rate, priority, is_active)
VALUES
  ('Summer Season 2026', 'a0000000-0000-0000-0000-000000000002', 'date_range', '2026-06-01', '2026-08-31', 450, 20, true);

-- Insert date override for New Year's Eve (all properties)
INSERT INTO pricing_rules (name, property_id, rule_type, specific_date, nightly_rate, priority, is_active)
VALUES
  ('New Years Eve - Downtown Loft', 'a0000000-0000-0000-0000-000000000001', 'date_override', '2025-12-31', 500, 30, true),
  ('New Years Eve - Beachfront Villa', 'a0000000-0000-0000-0000-000000000002', 'date_override', '2025-12-31', 800, 30, true),
  ('New Years Eve - Mountain Cabin', 'a0000000-0000-0000-0000-000000000003', 'date_override', '2025-12-31', 600, 30, true);

-- Insert add-ons
INSERT INTO add_ons (name, description, price, type, active, property_ids)
VALUES
  ('Early Check-in', 'Check in at 12:00 PM instead of 3:00 PM', 50, 'flat', true, '{}'),
  ('Late Check-out', 'Check out at 2:00 PM instead of 11:00 AM', 50, 'flat', true, '{}'),
  ('Pet Fee', 'Bring your furry friend along', 25, 'per_night', true, '{}');

-- Update settings
UPDATE settings 
SET 
  company_name = 'Luxe Rentals',
  standard_check_in_time = '15:00',
  standard_check_out_time = '11:00',
  updated_at = now()
WHERE id = 1;

-- Insert default settings if not exists
INSERT INTO settings (id, primary_color, accent_color, company_name, standard_check_in_time, standard_check_out_time, rental_policies)
VALUES (1, '#1d4ed8', '#7c3aed', 'Luxe Rentals', '15:00', '11:00', '{}')
ON CONFLICT (id) DO NOTHING;
