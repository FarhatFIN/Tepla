-- 008: Per-user chat archive (Telegram-style).
--
-- Archiving is personal: the flag lives on chat_members, not on chats,
-- so each member controls their own archive independently.

ALTER TABLE chat_members ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_chat_members_archived
  ON chat_members (user_id)
  WHERE is_archived = true;
