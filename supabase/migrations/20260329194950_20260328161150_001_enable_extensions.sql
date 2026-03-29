/*
  # Enable Required PostgreSQL Extensions

  1. Extensions Enabled
    - `uuid-ossp` - UUID generation functions (gen_random_uuid)
    - `pgcrypto` - Cryptographic functions for secure data handling

  2. Notes
    - These extensions are required for UUID primary keys and encryption
    - pg_cron is managed by Supabase and enabled separately
*/

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
