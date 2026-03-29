-- ============================================================
-- Migration 002: Key Transparency — Append-Only Log
-- ============================================================

BEGIN;

-- Append-only log of all identity key publications.
-- leaf_index is auto-incrementing and NEVER reused (gap-free via SERIAL).
-- Rows are NEVER updated or deleted — enforced by trigger.
CREATE TABLE IF NOT EXISTS kt_log (
  leaf_index SERIAL PRIMARY KEY,       -- monotonic, gap-free
  user_id UUID NOT NULL REFERENCES users(id),
  identity_key_hex TEXT NOT NULL,      -- hex-encoded public key
  leaf_hash TEXT NOT NULL,             -- SHA-256(userId || key || timestamp)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_kt_log_user ON kt_log(user_id, leaf_index DESC);

-- Prevent any UPDATE or DELETE on kt_log (append-only enforcement)
CREATE OR REPLACE FUNCTION kt_log_immutable() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'kt_log is append-only: % operations are forbidden', TG_OP;
END
$$ LANGUAGE plpgsql;

CREATE TRIGGER kt_log_no_update
  BEFORE UPDATE ON kt_log FOR EACH ROW
  EXECUTE FUNCTION kt_log_immutable();

CREATE TRIGGER kt_log_no_delete
  BEFORE DELETE ON kt_log FOR EACH ROW
  EXECUTE FUNCTION kt_log_immutable();

-- Signed tree heads — server persists each STH for auditing
CREATE TABLE IF NOT EXISTS kt_signed_tree_heads (
  id SERIAL PRIMARY KEY,
  tree_size INTEGER NOT NULL,
  root_hash TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  signature TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_kt_sth_size ON kt_signed_tree_heads(tree_size DESC);

COMMIT;
