BEGIN;

CREATE TABLE IF NOT EXISTS encrypted_backups (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  encrypted_blob TEXT NOT NULL,
  iv TEXT NOT NULL,
  salt TEXT NOT NULL,
  argon2_memory_cost INTEGER NOT NULL,
  argon2_time_cost INTEGER NOT NULL,
  argon2_parallelism INTEGER NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- No index on encrypted_blob — server never searches by content.
-- Only user_id PK lookup.

COMMIT;
