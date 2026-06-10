-- Migration 005: Outbox DLQ + atomicity improvements
-- Adds dead letter support, error tracking, and correlation to outbox table

-- Add missing columns for DLQ and tracing
ALTER TABLE outbox ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE outbox ADD COLUMN IF NOT EXISTS error TEXT;
ALTER TABLE outbox ADD COLUMN IF NOT EXISTS correlation_id TEXT;
ALTER TABLE outbox ADD COLUMN IF NOT EXISTS max_retries INTEGER NOT NULL DEFAULT 5;
ALTER TABLE outbox ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;

-- Backfill status for existing rows
UPDATE outbox SET status = 'processed' WHERE published_at IS NOT NULL AND status = 'pending';
UPDATE outbox SET status = 'dead' WHERE retries >= 5 AND published_at IS NULL AND status = 'pending';

-- New index for worker polling (status-based instead of published_at NULL check)
CREATE INDEX IF NOT EXISTS idx_outbox_pending ON outbox(status, created_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_outbox_dead ON outbox(status) WHERE status = 'dead';
CREATE INDEX IF NOT EXISTS idx_outbox_aggregate ON outbox(aggregate_id);
