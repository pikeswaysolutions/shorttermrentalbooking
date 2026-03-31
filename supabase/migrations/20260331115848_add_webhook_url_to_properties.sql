/*
  # Add webhook_url to properties table

  ## Summary
  Adds an optional webhook URL field to each property so that property owners
  and admins can configure an external automation endpoint (e.g., Zapier, Make)
  that receives a JSON payload whenever a booking for that property is confirmed.

  ## Changes

  ### Modified Tables
  - `properties`
    - Added `webhook_url` (text, nullable) - Stores the external HTTP POST endpoint
      for automation triggers. NULL means no webhook is configured for this property.

  ## Notes
  1. This column is intentionally nullable - no webhook is the default state.
  2. No RLS changes are required; the column falls under the existing properties RLS policies.
  3. The column is text (not a constrained URL type) to allow flexibility; URL validation
     is handled at the application layer.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'properties' AND column_name = 'webhook_url'
  ) THEN
    ALTER TABLE properties ADD COLUMN webhook_url text DEFAULT NULL;
  END IF;
END $$;
