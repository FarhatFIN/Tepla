-- 009: Per-user pin and mute flags (Telegram-style).
-- Like the archive flag (008), these are personal and live on chat_members.

ALTER TABLE chat_members ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE chat_members ADD COLUMN IF NOT EXISTS is_muted BOOLEAN NOT NULL DEFAULT false;
