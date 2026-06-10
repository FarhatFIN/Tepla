/**
 * X3DH (Extended Triple Diffie-Hellman) key agreement for Tepla secret chats.
 *
 * Establishes a shared secret between two parties using the prekey bundle
 * served by services/auth-user-service (/api/e2e/keys/bundle/:userId).
 *
 * Key material:
 * - Identity DH key (X25519)      — long-term, used in DH computations
 * - Identity signing key (Ed25519) — long-term, signs prekeys, published to the KT log
 * - Signed prekey (X25519)         — medium-term, rotated periodically
 * - One-time prekeys (X25519)      — single-use, consumed per session
 *
 * The resulting 32-byte shared secret seeds the Double Ratchet (./ratchet).
 *
 * npm: @noble/curves, @noble/ed25519, @noble/hashes (pure JS, audited)
 */

import { x25519 } from '@noble/curves/ed25519.js';
import * as ed from '@noble/ed25519';
import { sha256 } from '@noble/hashes/sha2.js';
import { hkdf } from '@noble/hashes/hkdf.js';
import { bytesToHex, hexToBytes, concatBytes, randomBytes } from '@noble/hashes/utils.js';

const X3DH_INFO = 'Tepla-X3DH-v1';
// Domain separator per the X3DH spec: 32 bytes of 0xFF for curve X25519.
const F = new Uint8Array(32).fill(0xff);

/** Hex-encoded keypair. Secret keys must never leave the device. */
export type DHKeyPair = {
  secretKey: string; // hex, 32 bytes
  publicKey: string; // hex, 32 bytes
};

export type IdentityKeys = {
  /** X25519 — participates in X3DH DH computations */
  dh: DHKeyPair;
  /** Ed25519 — signs prekeys; this is the key published to the KT log */
  signing: DHKeyPair;
};

export type SignedPrekey = {
  keyId: number;
  keyPair: DHKeyPair;
  /** hex Ed25519 signature over the prekey public key */
  signature: string;
};

/** Shape of the bundle returned by GET /api/e2e/keys/bundle/:userId (plus KT identity key). */
export type X3DHBundle = {
  identityDhKey: string;
  identitySigningKey: string;
  signedPrekey: string;
  signedPrekeySignature: string;
  oneTimePrekey?: string | null;
};

export type X3DHInitResult = {
  /** 32-byte SK — feeds Double Ratchet initSender() */
  sharedSecret: Uint8Array;
  /** Sent to the responder in the first message so they can derive the same SK */
  ephemeralPublicKey: string;
};

// ─── Key Generation ──────────────────────────────

export function generateDHKeyPair(): DHKeyPair {
  const secret = randomBytes(32);
  return {
    secretKey: bytesToHex(secret),
    publicKey: bytesToHex(x25519.getPublicKey(secret)),
  };
}

export async function generateSigningKeyPair(): Promise<DHKeyPair> {
  const secret = randomBytes(32);
  const pub = await ed.getPublicKeyAsync(secret);
  return { secretKey: bytesToHex(secret), publicKey: bytesToHex(pub) };
}

export async function generateIdentity(): Promise<IdentityKeys> {
  return { dh: generateDHKeyPair(), signing: await generateSigningKeyPair() };
}

export async function generateSignedPrekey(identity: IdentityKeys, keyId: number): Promise<SignedPrekey> {
  const keyPair = generateDHKeyPair();
  const signature = bytesToHex(
    await ed.signAsync(hexToBytes(keyPair.publicKey), hexToBytes(identity.signing.secretKey))
  );
  return { keyId, keyPair, signature };
}

/** Generate a batch of one-time prekeys for upload to POST /api/e2e/keys/one-time. */
export function generateOneTimePrekeys(count: number, startId = 1): Array<{ keyId: number; keyPair: DHKeyPair }> {
  return Array.from({ length: count }, (_, i) => ({ keyId: startId + i, keyPair: generateDHKeyPair() }));
}

export async function verifySignedPrekey(
  signedPrekeyPub: string,
  signature: string,
  signingPub: string
): Promise<boolean> {
  try {
    return await ed.verifyAsync(hexToBytes(signature), hexToBytes(signedPrekeyPub), hexToBytes(signingPub));
  } catch {
    return false;
  }
}

// ─── Session Establishment ───────────────────────

/**
 * Initiator (Alice) side. Verifies the signed prekey signature first —
 * an invalid signature means the server (or a MITM) substituted keys.
 */
export async function x3dhInitiate(ourIdentity: IdentityKeys, bundle: X3DHBundle): Promise<X3DHInitResult> {
  const valid = await verifySignedPrekey(
    bundle.signedPrekey,
    bundle.signedPrekeySignature,
    bundle.identitySigningKey
  );
  if (!valid) {
    throw new Error('Invalid signed prekey signature — possible MITM, aborting session setup');
  }

  const ephemeral = generateDHKeyPair();
  const ikA = hexToBytes(ourIdentity.dh.secretKey);
  const ekA = hexToBytes(ephemeral.secretKey);
  const ikB = hexToBytes(bundle.identityDhKey);
  const spkB = hexToBytes(bundle.signedPrekey);

  const parts: Uint8Array[] = [
    x25519.getSharedSecret(ikA, spkB), // DH1 = DH(IK_A, SPK_B)
    x25519.getSharedSecret(ekA, ikB),  // DH2 = DH(EK_A, IK_B)
    x25519.getSharedSecret(ekA, spkB), // DH3 = DH(EK_A, SPK_B)
  ];
  if (bundle.oneTimePrekey) {
    parts.push(x25519.getSharedSecret(ekA, hexToBytes(bundle.oneTimePrekey))); // DH4 = DH(EK_A, OPK_B)
  }

  const sharedSecret = hkdf(sha256, concatBytes(F, ...parts), new Uint8Array(32), X3DH_INFO, 32);
  return { sharedSecret, ephemeralPublicKey: ephemeral.publicKey };
}

/**
 * Responder (Bob) side. Mirrors the initiator's DH computations using
 * his own secret keys and the initiator's public keys from the first message.
 */
export function x3dhRespond(
  ourIdentity: IdentityKeys,
  ourSignedPrekeySecret: string,
  theirIdentityDhKey: string,
  theirEphemeralKey: string,
  ourOneTimePrekeySecret?: string | null
): Uint8Array {
  const ikB = hexToBytes(ourIdentity.dh.secretKey);
  const spkB = hexToBytes(ourSignedPrekeySecret);
  const ikA = hexToBytes(theirIdentityDhKey);
  const ekA = hexToBytes(theirEphemeralKey);

  const parts: Uint8Array[] = [
    x25519.getSharedSecret(spkB, ikA), // DH1
    x25519.getSharedSecret(ikB, ekA),  // DH2
    x25519.getSharedSecret(spkB, ekA), // DH3
  ];
  if (ourOneTimePrekeySecret) {
    parts.push(x25519.getSharedSecret(hexToBytes(ourOneTimePrekeySecret), ekA)); // DH4
  }

  return hkdf(sha256, concatBytes(F, ...parts), new Uint8Array(32), X3DH_INFO, 32);
}
