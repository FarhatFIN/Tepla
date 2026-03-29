-- ============================================================
-- Migration 003: Multi-Device E2EE
-- ============================================================

BEGIN;

-- Each device has its own identity key + prekey bundle
CREATE TABLE IF NOT EXISTS user_devices (
  device_id UUID PRIMARY KEY DEFAULT gen_uuidv7(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_name TEXT NOT NULL,                -- "iPhone 15", "MacBook Pro"
  identity_key_pub TEXT NOT NULL,           -- base64 Ed25519 public key
  signed_prekey_pub TEXT NOT NULL,          -- base64 X25519 public key
  signed_prekey_sig TEXT NOT NULL,          -- Ed25519 signature
  signed_prekey_id INTEGER NOT NULL DEFAULT 1,
  trust_level INTEGER NOT NULL DEFAULT 0,  -- 0=new, 1=verified, 2=trusted
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ                   -- NULL = active
);

CREATE INDEX idx_user_devices_user ON user_devices(user_id) WHERE revoked_at IS NULL;

-- Per-device one-time prekeys
CREATE TABLE IF NOT EXISTS device_one_time_prekeys (
  id SERIAL PRIMARY KEY,
  device_id UUID NOT NULL REFERENCES user_devices(device_id) ON DELETE CASCADE,
  key_id INTEGER NOT NULL,
  prekey TEXT NOT NULL,                     -- base64 X25519 public key
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (device_id, key_id)
);

CREATE INDEX idx_device_otp_available ON device_one_time_prekeys(device_id, used) WHERE used = false;

-- Encrypted message envelopes — one per recipient device
-- Server stores multiple ciphertexts for the same message (fan-out)
CREATE TABLE IF NOT EXISTS message_envelopes (
  id UUID PRIMARY KEY DEFAULT gen_uuidv7(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  recipient_device_id UUID NOT NULL REFERENCES user_devices(device_id),
  ciphertext TEXT NOT NULL,                -- encrypted for this specific device
  content_iv TEXT,
  x3dh_header JSONB,                       -- only in first message of a session
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_envelopes_device ON message_envelopes(recipient_device_id, delivered_at)
  WHERE delivered_at IS NULL;
CREATE INDEX idx_envelopes_message ON message_envelopes(message_id);

-- Device linking requests (for transferring keys between devices)
CREATE TABLE IF NOT EXISTS device_link_requests (
  id UUID PRIMARY KEY DEFAULT gen_uuidv7(),
  user_id UUID NOT NULL REFERENCES users(id),
  requesting_device_id UUID NOT NULL REFERENCES user_devices(device_id),
  approving_device_id UUID REFERENCES user_devices(device_id),
  challenge TEXT NOT NULL,                  -- random challenge for QR code
  encrypted_bundle TEXT,                    -- identity keys encrypted with shared secret
  status TEXT NOT NULL DEFAULT 'pending'    -- pending, approved, rejected, expired
    CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMIT;
