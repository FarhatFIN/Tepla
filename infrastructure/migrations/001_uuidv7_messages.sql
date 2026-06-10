-- ============================================================
-- Migration 001: UUIDv7 for messages, files, polls, sparks_transactions
-- UUIDv7 embeds a millisecond timestamp → naturally sortable,
-- eliminates the need for created_at in ORDER BY for pagination,
-- and produces B-tree-friendly sequential inserts (no page splits).
-- ============================================================

BEGIN;

-- ─── 1. Install pgcrypto + helper function ──────────────────
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Generate UUIDv7 in pure SQL (ms-precision timestamp + random)
CREATE OR REPLACE FUNCTION gen_uuidv7() RETURNS uuid AS $$
DECLARE
  ts_ms  bigint;
  uuid_bytes bytea;
BEGIN
  ts_ms := (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::bigint;
  -- 6 bytes timestamp + 10 bytes random
  uuid_bytes := substring(int8send(ts_ms) FROM 3 FOR 6)
             || gen_random_bytes(10);
  -- Set version 7 (bits 48-51)
  uuid_bytes := set_byte(uuid_bytes, 6, (get_byte(uuid_bytes, 6) & x'0F'::int) | x'70'::int);
  -- Set variant 2 (bits 64-65)
  uuid_bytes := set_byte(uuid_bytes, 8, (get_byte(uuid_bytes, 8) & x'3F'::int) | x'80'::int);
  RETURN encode(uuid_bytes, 'hex')::uuid;
END
$$ LANGUAGE plpgsql VOLATILE;

-- ─── 2. messages — add id_v7, backfill, swap PK ─────────────

-- 2a. Add new column
ALTER TABLE messages ADD COLUMN IF NOT EXISTS id_v7 UUID;

-- 2b. Backfill: derive UUIDv7 from existing created_at + random
UPDATE messages SET id_v7 = (
  SELECT (
    lpad(to_hex((EXTRACT(EPOCH FROM messages.created_at) * 1000)::bigint), 12, '0')
    || encode(gen_random_bytes(2), 'hex')
    || '7' || substring(encode(gen_random_bytes(2), 'hex') FROM 2 FOR 3)
    || substring('89ab', 1 + floor(random() * 4)::int, 1)
    || encode(gen_random_bytes(7), 'hex')
  )::uuid
)
WHERE id_v7 IS NULL;

-- 2c. Unique constraint on id_v7
ALTER TABLE messages ADD CONSTRAINT messages_id_v7_unique UNIQUE (id_v7);

-- 2d. Set default for new rows
ALTER TABLE messages ALTER COLUMN id_v7 SET DEFAULT gen_uuidv7();
ALTER TABLE messages ALTER COLUMN id_v7 SET NOT NULL;

-- 2e. Update foreign keys pointing to messages.id
-- reply_to_id, forward_from_id — self-referencing
-- We keep the old `id` column for now; downstream tables reference it.
-- Phase 2 (separate migration) will swap PK after all services switch to id_v7.

-- 2f. Index for cursor pagination (replaces created_at sort)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_chat_idv7
  ON messages (chat_id, id_v7 DESC);

-- ─── 3. files — add id_v7 ───────────────────────────────────
ALTER TABLE files ADD COLUMN IF NOT EXISTS id_v7 UUID;

UPDATE files SET id_v7 = (
  SELECT (
    lpad(to_hex((EXTRACT(EPOCH FROM files.created_at) * 1000)::bigint), 12, '0')
    || encode(gen_random_bytes(2), 'hex')
    || '7' || substring(encode(gen_random_bytes(2), 'hex') FROM 2 FOR 3)
    || substring('89ab', 1 + floor(random() * 4)::int, 1)
    || encode(gen_random_bytes(7), 'hex')
  )::uuid
)
WHERE id_v7 IS NULL;

ALTER TABLE files ADD CONSTRAINT files_id_v7_unique UNIQUE (id_v7);
ALTER TABLE files ALTER COLUMN id_v7 SET DEFAULT gen_uuidv7();
ALTER TABLE files ALTER COLUMN id_v7 SET NOT NULL;

-- ─── 4. polls — add id_v7 ───────────────────────────────────
ALTER TABLE polls ADD COLUMN IF NOT EXISTS id_v7 UUID;

UPDATE polls SET id_v7 = (
  SELECT (
    lpad(to_hex((EXTRACT(EPOCH FROM polls.created_at) * 1000)::bigint), 12, '0')
    || encode(gen_random_bytes(2), 'hex')
    || '7' || substring(encode(gen_random_bytes(2), 'hex') FROM 2 FOR 3)
    || substring('89ab', 1 + floor(random() * 4)::int, 1)
    || encode(gen_random_bytes(7), 'hex')
  )::uuid
)
WHERE id_v7 IS NULL;

ALTER TABLE polls ADD CONSTRAINT polls_id_v7_unique UNIQUE (id_v7);
ALTER TABLE polls ALTER COLUMN id_v7 SET DEFAULT gen_uuidv7();
ALTER TABLE polls ALTER COLUMN id_v7 SET NOT NULL;

-- ─── 5. sparks_transactions — add id_v7 ─────────────────────
ALTER TABLE sparks_transactions ADD COLUMN IF NOT EXISTS id_v7 UUID;

UPDATE sparks_transactions SET id_v7 = (
  SELECT (
    lpad(to_hex((EXTRACT(EPOCH FROM sparks_transactions.created_at) * 1000)::bigint), 12, '0')
    || encode(gen_random_bytes(2), 'hex')
    || '7' || substring(encode(gen_random_bytes(2), 'hex') FROM 2 FOR 3)
    || substring('89ab', 1 + floor(random() * 4)::int, 1)
    || encode(gen_random_bytes(7), 'hex')
  )::uuid
)
WHERE id_v7 IS NULL;

ALTER TABLE sparks_transactions ADD CONSTRAINT sparks_transactions_id_v7_unique UNIQUE (id_v7);
ALTER TABLE sparks_transactions ALTER COLUMN id_v7 SET DEFAULT gen_uuidv7();
ALTER TABLE sparks_transactions ALTER COLUMN id_v7 SET NOT NULL;

COMMIT;

-- ============================================================
-- Phase 2 migration (run AFTER all services use id_v7):
--
--   BEGIN;
--   -- Drop old PK, rename columns, set new PK
--   ALTER TABLE messages DROP CONSTRAINT messages_pkey;
--   ALTER TABLE messages RENAME COLUMN id TO id_v4;
--   ALTER TABLE messages RENAME COLUMN id_v7 TO id;
--   ALTER TABLE messages ADD PRIMARY KEY (id);
--   -- Update FKs (message_reads, reactions, files, etc.)
--   -- ... repeat for files, polls, sparks_transactions
--   COMMIT;
-- ============================================================
