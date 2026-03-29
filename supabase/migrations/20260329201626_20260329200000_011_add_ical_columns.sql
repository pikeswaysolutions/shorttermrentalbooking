/*
  # Add iCal Sync Columns for Two-Way Calendar Integration

  1. Changes to `properties` table
    - `ical_export_token` (uuid) - Unique secret token for export URL security
    - `ical_import_urls` (text[]) - Array of external iCal URLs to import
    - `ical_last_synced_at` (timestamptz) - Timestamp of last successful import

  2. Changes to `blocked_dates` table
    - `external_uid` (text) - UID from external iCal event for deduplication
    - `source` (text) - Origin: 'manual', 'airbnb', 'vrbo', 'ical'

  3. Security
    - Export tokens are UUIDs that cannot be guessed
    - External UIDs enable proper sync (update/delete when external changes)

  4. Notes
    - Same-day turnover: DTEND dates are NOT blocked (checkout day stays open)
    - Deduplication uses (property_id, external_uid) composite
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'properties' AND column_name = 'ical_export_token'
  ) THEN
    ALTER TABLE properties ADD COLUMN ical_export_token uuid DEFAULT gen_random_uuid();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'properties' AND column_name = 'ical_import_urls'
  ) THEN
    ALTER TABLE properties ADD COLUMN ical_import_urls text[] DEFAULT '{}';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'properties' AND column_name = 'ical_last_synced_at'
  ) THEN
    ALTER TABLE properties ADD COLUMN ical_last_synced_at timestamptz;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'blocked_dates' AND column_name = 'external_uid'
  ) THEN
    ALTER TABLE blocked_dates ADD COLUMN external_uid text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'blocked_dates' AND column_name = 'source'
  ) THEN
    ALTER TABLE blocked_dates ADD COLUMN source text DEFAULT 'manual';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_blocked_dates_external_uid 
  ON blocked_dates(property_id, external_uid) 
  WHERE external_uid IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_properties_ical_token 
  ON properties(ical_export_token);
