/**
 * Sealed Sender — Hide sender identity from server
 *
 * Envelope format:
 *   OUTER (visible to server):
 *     recipient_device_id  — server routes by this
 *     encrypted_inner      — opaque blob to server
 *
 *   INNER (encrypted with recipient's identity key):
 *     sender_id
 *     sender_device_id
 *     sender_identity_key
 *     ratchet_message      — Double Ratchet ciphertext
 *
 * Server sees: who RECEIVES, but not who SENDS.
 * Only the recipient can decrypt the inner envelope to learn the sender.
 *
 * npm: libsodium-wrappers (already in use)
 *
 * Production risk: server can correlate by timing/size even without sender_id.
 * Mitigation: combine with message padding + delivery batching.
 */

import sodium from "libsodium-wrappers";
import { ensureSodiumReady } from "./keys";

const b64 = sodium.base64_variants.URLSAFE_NO_PADDING;
const SEALED_VERSION = 1;

export interface SealedEnvelope {
  version: number;
  recipientDeviceId: string;
  encryptedInner: string;  // base64 — crypto_box_seal (anonymous, no sender key visible)
}

export interface InnerEnvelope {
  senderId: string;
  senderDeviceId: string;
  senderIdentityKey: string;  // base64
  ratchetMessage: string;     // JSON-stringified RatchetMessage
  timestamp: number;          // unix ms — for replay detection
}

/**
 * Seal a message: encrypt inner envelope with recipient's X25519 public key.
 * Uses crypto_box_seal (anonymous encryption — no sender key in ciphertext).
 */
export async function sealMessage(
  recipientDeviceId: string,
  recipientIdentityKeyPub: string,  // base64 Ed25519 pub
  inner: InnerEnvelope
): Promise<SealedEnvelope> {
  await ensureSodiumReady();

  // Convert Ed25519 ��� X25519 for encryption
  const recipientEd = sodium.from_base64(recipientIdentityKeyPub, b64);
  const recipientX = sodium.crypto_sign_ed25519_pk_to_curve25519(recipientEd);

  const plaintext = new TextEncoder().encode(JSON.stringify(inner));
  const sealed = sodium.crypto_box_seal(plaintext, recipientX);

  return {
    version: SEALED_VERSION,
    recipientDeviceId,
    encryptedInner: sodium.to_base64(sealed, b64),
  };
}

/**
 * Unseal a message: decrypt with our secret key to reveal sender identity.
 */
export async function unsealMessage(
  ourIdentityKeyPub: Uint8Array,  // Ed25519
  ourIdentityKeySk: Uint8Array,   // Ed25519
  envelope: SealedEnvelope
): Promise<InnerEnvelope> {
  await ensureSodiumReady();

  const ourX25519Pub = sodium.crypto_sign_ed25519_pk_to_curve25519(ourIdentityKeyPub);
  const ourX25519Sk = sodium.crypto_sign_ed25519_sk_to_curve25519(ourIdentityKeySk);

  const sealed = sodium.from_base64(envelope.encryptedInner, b64);
  const plaintext = sodium.crypto_box_seal_open(sealed, ourX25519Pub, ourX25519Sk);

  const inner: InnerEnvelope = JSON.parse(new TextDecoder().decode(plaintext));

  // Replay protection: reject messages > 5 minutes old
  const age = Date.now() - inner.timestamp;
  if (age > 300_000 || age < -30_000) {
    throw new Error('Sealed sender: message timestamp out of range');
  }

  return inner;
}

// ─── Message Padding ─────────────────────────────
// Prevents server from inferring content type/length from ciphertext size.

const PADDING_BUCKETS = [256, 512, 1024, 2048, 4096, 8192, 16384];

/**
 * Pad plaintext to the next bucket size before encryption.
 * Format: [4 bytes real length (big endian)] [plaintext] [random padding]
 */
export function padToBucket(plaintext: Uint8Array): Uint8Array {
  const totalNeeded = 4 + plaintext.length;
  let bucketSize = PADDING_BUCKETS.find(b => b >= totalNeeded)
    || totalNeeded + (256 - (totalNeeded % 256)); // round up to 256 for very large messages

  const padded = new Uint8Array(bucketSize);

  // Write real length as 4-byte big-endian
  const view = new DataView(padded.buffer);
  view.setUint32(0, plaintext.length, false);

  // Copy plaintext
  padded.set(plaintext, 4);

  // Fill rest with random bytes (not zeros — prevents pattern detection)
  const padding = crypto.getRandomValues(new Uint8Array(bucketSize - 4 - plaintext.length));
  padded.set(padding, 4 + plaintext.length);

  return padded;
}

/**
 * Remove padding after decryption.
 */
export function unpad(padded: Uint8Array): Uint8Array {
  const view = new DataView(padded.buffer, padded.byteOffset);
  const realLength = view.getUint32(0, false);

  if (realLength > padded.length - 4) {
    throw new Error('Invalid padding: declared length exceeds buffer');
  }

  return padded.slice(4, 4 + realLength);
}
