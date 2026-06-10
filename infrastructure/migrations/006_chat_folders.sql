-- ============================================================
-- Migration 006: Telegram-style chat folders
-- Per-user folders for organizing chats. Backed by two tables:
-- chat_folders (folder metadata) and chat_folder_items (membership).
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS chat_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 32),
  emoji TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_folder_items (
  folder_id UUID NOT NULL REFERENCES chat_folders(id) ON DELETE CASCADE,
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (folder_id, chat_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_folders_user ON chat_folders(user_id, position);
CREATE INDEX IF NOT EXISTS idx_chat_folder_items_chat ON chat_folder_items(chat_id);

COMMIT;
