-- 007: Idempotent message sends (replay/dedup protection).
--
-- Clients may attach a clientMessageId (UUID generated on the device) to
-- POST /api/messages. The same (chat, sender, clientMessageId) is only ever
-- inserted once; duplicate deliveries (retries, replays) return the original
-- message and do not emit a second MESSAGE_SENT event.

ALTER TABLE messages ADD COLUMN IF NOT EXISTS client_message_id UUID;

CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_client_dedup
  ON messages (chat_id, sender_id, client_message_id)
  WHERE client_message_id IS NOT NULL;
