/*
  # Add wizard_button_color to settings table

  ## Summary
  Adds a new optional column to store a custom button color for the embedded booking wizard.

  ## Changes
  - `settings` table: new nullable text column `wizard_button_color`
    - When set, overrides the Reserve/Submit/Book Another Stay button color in the embedded widget
    - When null, falls back to the site's primary color

  ## Notes
  - No RLS changes needed; settings table already has existing policies
  - Column is nullable so existing rows continue to work without migration data update
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'settings' AND column_name = 'wizard_button_color'
  ) THEN
    ALTER TABLE settings ADD COLUMN wizard_button_color text;
  END IF;
END $$;
