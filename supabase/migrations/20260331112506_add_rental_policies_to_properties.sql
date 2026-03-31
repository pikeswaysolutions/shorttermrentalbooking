/*
  # Add rental_policies to properties table

  ## Summary
  Adds a property-level rental policies override column to the properties table.

  ## Changes
  ### Modified Tables
  - `properties`
    - Added `rental_policies` (jsonb, nullable) — stores property-specific overrides for the
      four policy sections (payment, cancellation, liability, cleanup). When null or empty,
      the booking wizard falls back to the global settings.rental_policies value.

  ## Notes
  - Column is nullable by design; null means "use global defaults"
  - No RLS changes required (covered by existing policies on the properties table)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'properties' AND column_name = 'rental_policies'
  ) THEN
    ALTER TABLE properties ADD COLUMN rental_policies jsonb DEFAULT NULL;
  END IF;
END $$;
