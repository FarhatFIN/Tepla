-- 012: Secret chats (E2E encrypted, Telegram-style)
-- The server stores only ciphertext for secret chats. Plaintext never
-- leaves the clients; key agreement uses the existing X3DH prekey
-- infrastructure (e2e_identity_keys / e2e_one_time_prekeys) and the
-- Double Ratchet implementation in shared/security.

ALTER TABLE messages ADD COLUMN IF NOT EXISTS content_iv TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS key_envelope JSONB;

CREATE INDEX IF NOT EXISTS idx_chats_secret ON chats(type) WHERE type = 'secret';
