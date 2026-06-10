/**
 * Multi-Device E2EE — Fan-out Encryption
 *
 * Each user has N devices, each with its own identity key + prekey bundle.
 * Sending a message encrypts it N times (once per recipient device).
 *
 * Flow:
 * 1. Sender fetches recipient's active devices: GET /api/devices/:userId
 * 2. For each device, sender either reuses existing ratchet session or initiates X3DH
 * 3. Sender encrypts plaintext once per device → N ciphertexts
 * 4. Server stores N envelopes, delivers to each device independently
 * 5. Each device decrypts with its own ratchet session
 *
 * Device linking:
 * 1. New device generates its own identity key
 * 2. New device displays QR code containing: deviceId + challenge + ephemeral pub key
 * 3. Existing device scans QR → establishes shared secret via X25519
 * 4. Existing device encrypts identity_key_bundle with shared secret → sends to server
 * 5. New device fetches encrypted_bundle → decrypts with shared secret
 * 6. New device has the history encryption keys needed to read old messages
 */

import sodium from "libsodium-wrappers";
import { ensureSodiumReady, generateX25519KeyPair, type X25519KeyPair } from "./keys";
import {
  ratchetEncrypt,
  ratchetDecrypt,
  initSender,
  persistSession,
  loadSession,
  type RatchetState,
  type RatchetMessage,
} from "./double-ratchet";
import { initiateX3DH, type X3DHIdentity, type PrekeyBundle } from "./x3dh";

const b64 = sodium.base64_variants.URLSAFE_NO_PADDING;

export interface DeviceInfo {
  deviceId: string;
  deviceName: string;
  identityKeyPub: string;   // base64
  signedPrekeyPub: string;  // base64
  signedPrekeySig: string;
  signedPrekeyId: number;
  trustLevel: number;
}

export interface MessageEnvelope {
  recipientDeviceId: string;
  ciphertext: string;
  contentIv: string;
  x3dhHeader?: {
    identityKey: string;
    ephemeralKey: string;
    usedOneTimePrekeyId: number | null;
  };
}

/**
 * Fan-out encrypt: one plaintext → N ciphertexts for N devices.
 */
export async function fanOutEncrypt(
  ourIdentity: X3DHIdentity,
  ourDeviceId: string,
  recipientDevices: DeviceInfo[],
  plaintext: string,
  sessions: Map<string, RatchetState>,
  apiBase: string,
  authToken: string
): Promise<{ envelopes: MessageEnvelope[]; updatedSessions: Map<string, RatchetState> }> {
  await ensureSodiumReady();
  const plaintextBytes = new TextEncoder().encode(plaintext);
  const envelopes: MessageEnvelope[] = [];
  const updatedSessions = new Map(sessions);

  for (const device of recipientDevices) {
    const sessionId = `dev:${ourDeviceId}:${device.deviceId}`;
    let state = updatedSessions.get(sessionId) || await loadSession(sessionId);
    let x3dhHeader: MessageEnvelope['x3dhHeader'] = undefined;

    if (!state) {
      // No session with this device — perform X3DH
      // Claim a one-time prekey for this device
      const bundleRes = await fetch(`${apiBase}/api/devices/${device.deviceId}/bundle`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      const { data: bundle } = await bundleRes.json();

      const prekeyBundle: PrekeyBundle = {
        userId: '', // device-level, not user-level
        identityKey: device.identityKeyPub,
        signedPrekey: device.signedPrekeyPub,
        signedPrekeySignature: device.signedPrekeySig,
        signedPrekeyId: device.signedPrekeyId,
        oneTimePrekey: bundle?.oneTimePrekey || null,
        oneTimePrekeyId: bundle?.oneTimePrekeyId || null,
      };

      const x3dhResult = await initiateX3DH(ourIdentity, prekeyBundle);
      const theirRatchetPub = sodium.from_base64(device.signedPrekeyPub, b64);
      state = await initSender(x3dhResult.sharedSecret, theirRatchetPub);

      x3dhHeader = {
        identityKey: sodium.to_base64(ourIdentity.identityKey.publicKey, b64),
        ephemeralKey: x3dhResult.ephemeralPublicKey,
        usedOneTimePrekeyId: x3dhResult.usedOneTimePrekeyId,
      };
    }

    const result = await ratchetEncrypt(state, plaintextBytes);
    updatedSessions.set(sessionId, result.state);
    await persistSession(sessionId, result.state);

    envelopes.push({
      recipientDeviceId: device.deviceId,
      ciphertext: JSON.stringify(result.message),
      contentIv: result.message.nonce,
      x3dhHeader,
    });
  }

  return { envelopes, updatedSessions };
}

/**
 * Device linking: generate QR code payload for a new device.
 * Contains a short-lived X25519 ephemeral key for establishing a secure channel.
 */
export async function generateLinkPayload(
  newDeviceId: string
): Promise<{
  qrData: string;           // JSON string for QR code
  ephemeralKey: X25519KeyPair;
}> {
  await ensureSodiumReady();
  const ephemeralKey = await generateX25519KeyPair();
  const challenge = sodium.to_base64(sodium.randombytes_buf(32), b64);

  const qrData = JSON.stringify({
    deviceId: newDeviceId,
    ephemeralPub: sodium.to_base64(ephemeralKey.publicKey, b64),
    challenge,
    version: 1,
  });

  return { qrData, ephemeralKey };
}

/**
 * Existing device: process scanned QR code and encrypt identity bundle for transfer.
 */
export async function encryptLinkBundle(
  ourIdentity: X3DHIdentity,
  newDeviceEphemeralPub: string,  // base64 from QR
  sessionHistory: Uint8Array       // serialized session state + keys
): Promise<string> {
  await ensureSodiumReady();

  // DH to derive shared secret
  const theirPub = sodium.from_base64(newDeviceEphemeralPub, b64);
  const tempKey = await generateX25519KeyPair();
  const sharedSecret = sodium.crypto_scalarmult(tempKey.secretKey, theirPub);

  // Derive encryption key via HKDF
  const key = sodium.crypto_generichash(32, sharedSecret);
  const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);

  // Encrypt the bundle
  const ciphertext = sodium.crypto_secretbox_easy(sessionHistory, nonce, key);

  return JSON.stringify({
    ephemeralPub: sodium.to_base64(tempKey.publicKey, b64),
    nonce: sodium.to_base64(nonce, b64),
    ciphertext: sodium.to_base64(ciphertext, b64),
  });
}

/**
 * New device: decrypt the identity bundle received from existing device.
 */
export async function decryptLinkBundle(
  ourEphemeralKey: X25519KeyPair,
  encryptedBundle: string
): Promise<Uint8Array> {
  await ensureSodiumReady();

  const { ephemeralPub, nonce, ciphertext } = JSON.parse(encryptedBundle);
  const theirPub = sodium.from_base64(ephemeralPub, b64);
  const sharedSecret = sodium.crypto_scalarmult(ourEphemeralKey.secretKey, theirPub);
  const key = sodium.crypto_generichash(32, sharedSecret);

  return sodium.crypto_secretbox_open_easy(
    sodium.from_base64(ciphertext, b64),
    sodium.from_base64(nonce, b64),
    key
  );
}

/**
 * Revoke a device — invalidates all sessions and prekeys.
 * Other users' clients will re-establish sessions on next message.
 */
export async function revokeDevice(
  apiBase: string,
  authToken: string,
  deviceId: string
): Promise<void> {
  await fetch(`${apiBase}/api/devices/${deviceId}/revoke`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
  });
  // Locally: delete all sessions involving this device
  // The IndexedDB cleanup is handled by the caller
}
