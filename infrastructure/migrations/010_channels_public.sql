-- 010: Public channels with usernames
-- Adds a unique @username handle and a public/private flag to chats.
-- Public channels are discoverable and can be joined by anyone.

ALTER TABLE chats ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE chats ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS idx_chats_username
  ON chats (username)
  WHERE username IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_chats_public_channels
  ON chats (type, is_public)
  WHERE type = 'channel' AND is_public = true;

-- Existing channels stay discoverable
UPDATE chats SET is_public = true WHERE type = 'channel';
