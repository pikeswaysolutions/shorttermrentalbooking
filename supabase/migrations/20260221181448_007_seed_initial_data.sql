/*
  # Seed Initial Data

  1. Event Types (3)
    - Wedding Reception ($200/hr, min 4 hrs)
    - Corporate Event ($150/hr, min 2 hrs)
    - Photo Shoot ($75/hr, min 1 hr)

  2. Pricing Rules (2)
    - Weekend Peak: $250/hr on Sun/Fri/Sat 12:00-23:59 (all event types)
    - Weekday Morning Discount: $100/hr on Mon-Thu 08:00-12:00 (Corporate Event only)

  3. Add-ons (3)
    - Projector & Screen ($50 flat, Corporate + Photo Shoot)
    - Catering Setup ($100 flat, Wedding + Corporate)
    - Security Guard ($40/hr, Wedding only)

  4. Default Settings
    - Company: Luxe Events
    - Primary color: #1d4ed8, Accent: #7c3aed
*/

INSERT INTO event_types (id, name, description, base_rate, min_duration, cooldown_hours, active, color, email_templates, confirmation_page)
VALUES
  (
    'a0000000-0000-0000-0000-000000000001',
    'Wedding Reception',
    'Full venue access for your special day',
    200, 4, 1, true, '#000000',
    '{"confirmationAlias": "", "followupAlias": "", "followupDaysBefore": 1}',
    '{}'
  ),
  (
    'a0000000-0000-0000-0000-000000000002',
    'Corporate Event',
    'Professional setting for meetings',
    150, 2, 1, true, '#000000',
    '{"confirmationAlias": "", "followupAlias": "", "followupDaysBefore": 1}',
    '{}'
  ),
  (
    'a0000000-0000-0000-0000-000000000003',
    'Photo Shoot',
    'Hourly rental for photographers',
    75, 1, 1, true, '#000000',
    '{"confirmationAlias": "", "followupAlias": "", "followupDaysBefore": 1}',
    '{}'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO pricing_rules (name, event_type_id, days, start_time, end_time, hourly_rate)
VALUES
  ('Weekend Peak', NULL, '{0,5,6}', '12:00', '23:59', 250),
  ('Weekday Morning Discount', 'a0000000-0000-0000-0000-000000000002', '{1,2,3,4}', '08:00', '12:00', 100);

INSERT INTO add_ons (name, description, price, type, active, event_type_ids)
VALUES
  ('Projector & Screen', 'High definition projection', 50, 'flat', true, '{"a0000000-0000-0000-0000-000000000002","a0000000-0000-0000-0000-000000000003"}'),
  ('Catering Setup', 'Tables and linens for food', 100, 'flat', true, '{"a0000000-0000-0000-0000-000000000001","a0000000-0000-0000-0000-000000000002"}'),
  ('Security Guard', 'Required for alcohol events', 40, 'hourly', true, '{"a0000000-0000-0000-0000-000000000001"}');

INSERT INTO settings (id, primary_color, accent_color, company_name, rental_policies)
VALUES (1, '#1d4ed8', '#7c3aed', 'Luxe Events', '{}')
ON CONFLICT (id) DO NOTHING;
