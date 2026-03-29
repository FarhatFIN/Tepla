/**
 * X3DH (Extended Triple Diffie-Hellman) Key Agreement — Client-Side
 *
 * Establishes a shared secret between two parties without the server
 * ever seeing plaintext. Uses libsodium X25519 + Ed25519.
 *
 * Flow:
 * 1. On registration, client generates identity key (Ed25519) + signed prekey (X25519)
 *    and uploads the public parts + a batch of one-time prekeys to the server.
 * 2. To start a chat, Alice fetches Bob's prekey bundle from the server.
 * 3. Alice performs X3DH to derive a shared secret, then initializes a Double Ratchet session.
 * 4. Alice sends her ephemeral public key + identity key in the first message header.
 * 5. Bob uses Alice's keys + his own private keys to derive the same shared secret.
 */

import sodium from "libsodium-wrappers";
import { HKDF } from "@stablelib/hkdf";
import { SHA256 } from "@stablelib/sha256";
import {
  generateX25519KeyPair,
  generateEd25519KeyPair,
  ensureSodiumReady,
  type X25519KeyPair,
  type Ed25519KeyPair,
} from "./keys";
import { saveEncryptedKey, loadEncryptedKey } from "./storage";

const X3DH_INFO = new TextEncoder().encode("Tepla/X3DH/v1");

export interface X3DHIdentity {
  identityKey: Ed25519KeyPair;         // long-term signing key
  signedPrekey: X25519KeyPair;         // medium-term DH key (rotated weekly)
  signedPrekeyId: number;
  signedPrekeySignature: Uint8Array;   // sign(identity, signedPrekey.pub)
}

export interface PrekeyBundle {
  userId: string;
  identityKey: string;       // base64 Ed25519 public
  signedPrekey: string;      // base64 X25519 public
  signedPrekeySignature: string;
  signedPrekeyId: number;
  oneTimePrekey: string | null;
  oneTimePrekeyId: number | null;
}

export interface X3DHResult {
  sharedSecret: Uint8Array;  // 32 bytes — becomes root key for Double Ratchet
  ephemeralPublicKey: string; // base64 — sent in first message header
  usedOneTimePrekeyId: number | null;
}

const b64 = sodium.base64_variants.URLSAFE_NO_PADDING;

/**
 * Generate a fresh X3DH identity (run once on registration / device setup).
 */
export async function generateX3DHIdentity(): Promise<X3DHIdentity> {
  await ensureSodiumReady();
  const identityKey = await generateEd25519KeyPair();
  const signedPrekey = await generateX25519KeyPair();

  // Sign the signed prekey with the identity key
  const signedPrekeySignature = sodium.crypto_sign_detached(
    signedPrekey.publicKey,
    identityKey.secretKey
  );

  return {
    identityKey,
    signedPrekey,
    signedPrekeyId: 1,
    signedPrekeySignature,
  };
}

/**
 * Generate a batch of one-time prekeys (X25519).
 */
export async function generateOneTimePrekeys(
  startId: number,
  count: number
): Promise<Array<{ keyId: number; keyPair: X25519KeyPair }>> {
  const prekeys: Array<{ keyId: number; keyPair: X25519KeyPair }> = [];
  for (let i = 0; i < count; i++) {
    prekeys.push({ keyId: startId + i, keyPair: await generateX25519KeyPair() });
  }
  return prekeys;
}

/**
 * Alice → initiates X3DH with Bob's prekey bundle.
 * Returns the shared secret + ephemeral key to send in the first message header.
 */
export async function initiateX3DH(
  ourIdentity: X3DHIdentity,
  theirBundle: PrekeyBundle
): Promise<X3DHResult> {
  await ensureSodiumReady();

  const theirIdentityPub = sodium.from_base64(theirBundle.identityKey, b64);
  const theirSignedPrekey = sodium.from_base64(theirBundle.signedPrekey, b64);
  const theirSignature = sodium.from_base64(theirBundle.signedPrekeySignature, b64);

  // Verify the signed prekey signature
  const signatureValid = sodium.crypto_sign_verify_detached(
    theirSignature,
    theirSignedPrekey,
    theirIdentityPub
  );
  if (!signatureValid) {
    throw new Error("X3DH: Signed prekey signature verification failed");
  }

  // Generate ephemeral key pair
  const ephemeral = await generateX25519KeyPair();

  // Convert Ed25519 identity keys to X25519 for DH
  const ourIdentityX = sodium.crypto_sign_ed25519_sk_to_curve25519(ourIdentity.identityKey.secretKey);
  const theirIdentityX = sodium.crypto_sign_ed25519_pk_to_curve25519(theirIdentityPub);

  // DH1 = DH(IK_A, SPK_B)
  const dh1 = sodium.crypto_scalarmult(ourIdentityX, theirSignedPrekey);
  // DH2 = DH(EK_A, IK_B)
  const dh2 = sodium.crypto_scalarmult(ephemeral.secretKey, theirIdentityX);
  // DH3 = DH(EK_A, SPK_B)
  const dh3 = sodium.crypto_scalarmult(ephemeral.secretKey, theirSignedPrekey);

  let dhConcat: Uint8Array;
  let usedOneTimePrekeyId: number | null = null;

  if (theirBundle.oneTimePrekey) {
    const theirOTP = sodium.from_base64(theirBundle.oneTimePrekey, b64);
    // DH4 = DH(EK_A, OPK_B)
    const dh4 = sodium.crypto_scalarmult(ephemeral.secretKey, theirOTP);
    dhConcat = new Uint8Array([...dh1, ...dh2, ...dh3, ...dh4]);
    usedOneTimePrekeyId = theirBundle.oneTimePrekeyId;
  } else {
    dhConcat = new Uint8Array([...dh1, ...dh2, ...dh3]);
  }

  // KDF: derive 32-byte shared secret
  const hkdf = new HKDF(SHA256, dhConcat, new Uint8Array(32) /* salt=zeros */, X3DH_INFO);
  const sharedSecret = hkdf.expand(32);

  return {
    sharedSecret,
    ephemeralPublicKey: sodium.to_base64(ephemeral.publicKey, b64),
    usedOneTimePrekeyId,
  };
}

/**
 * Bob → responds to Alice's X3DH initiation.
 * Called when Bob receives Alice's first message containing the ephemeral public key.
 */
export async function respondX3DH(
  ourIdentity: X3DHIdentity,
  theirIdentityKeyBase64: string,
  theirEphemeralKeyBase64: string,
  usedOneTimePrekeyId: number | null,
  oneTimePrekeys: Map<number, X25519KeyPair>
): Promise<Uint8Array> {
  await ensureSodiumReady();

  const theirIdentityPub = sodium.from_base64(theirIdentityKeyBase64, b64);
  const theirEphemeral = sodium.from_base64(theirEphemeralKeyBase64, b64);

  // Convert Ed25519 identity keys to X25519
  const ourIdentityX = sodium.crypto_sign_ed25519_sk_to_curve25519(ourIdentity.identityKey.secretKey);
  const theirIdentityX = sodium.crypto_sign_ed25519_pk_to_curve25519(theirIdentityPub);

  // DH1 = DH(SPK_B, IK_A) — note: reversed from Alice's perspective
  const dh1 = sodium.crypto_scalarmult(ourIdentity.signedPrekey.secretKey, theirIdentityX);
  // DH2 = DH(IK_B, EK_A)
  const dh2 = sodium.crypto_scalarmult(ourIdentityX, theirEphemeral);
  // DH3 = DH(SPK_B, EK_A)
  const dh3 = sodium.crypto_scalarmult(ourIdentity.signedPrekey.secretKey, theirEphemeral);

  let dhConcat: Uint8Array;

  if (usedOneTimePrekeyId !== null) {
    const otpKey = oneTimePrekeys.get(usedOneTimePrekeyId);
    if (!otpKey) throw new Error("X3DH: Used one-time prekey not found locally");
    // DH4 = DH(OPK_B, EK_A)
    const dh4 = sodium.crypto_scalarmult(otpKey.secretKey, theirEphemeral);
    dhConcat = new Uint8Array([...dh1, ...dh2, ...dh3, ...dh4]);
  } else {
    dhConcat = new Uint8Array([...dh1, ...dh2, ...dh3]);
  }

  const hkdf = new HKDF(SHA256, dhConcat, new Uint8Array(32), X3DH_INFO);
  return hkdf.expand(32);
}

// ─── IndexedDB persistence helpers ───────────────────────────

const IDENTITY_KEY = "x3dh:identity";
const SIGNED_PREKEY = "x3dh:signedPrekey";
const OTP_PREFIX = "x3dh:otp:";

export async function persistIdentity(identity: X3DHIdentity): Promise<void> {
  await saveEncryptedKey(IDENTITY_KEY, identity.identityKey.secretKey);
  await saveEncryptedKey(`${IDENTITY_KEY}:pub`, identity.identityKey.publicKey);
  await saveEncryptedKey(SIGNED_PREKEY, identity.signedPrekey.secretKey);
  await saveEncryptedKey(`${SIGNED_PREKEY}:pub`, identity.signedPrekey.publicKey);
  await saveEncryptedKey(`${SIGNED_PREKEY}:sig`, identity.signedPrekeySignature);
}

export async function loadIdentity(): Promise<X3DHIdentity | null> {
  const ikSk = await loadEncryptedKey(IDENTITY_KEY);
  const ikPk = await loadEncryptedKey(`${IDENTITY_KEY}:pub`);
  const spkSk = await loadEncryptedKey(SIGNED_PREKEY);
  const spkPk = await loadEncryptedKey(`${SIGNED_PREKEY}:pub`);
  const spkSig = await loadEncryptedKey(`${SIGNED_PREKEY}:sig`);

  if (!ikSk || !ikPk || !spkSk || !spkPk || !spkSig) return null;

  return {
    identityKey: { secretKey: ikSk, publicKey: ikPk },
    signedPrekey: { secretKey: spkSk, publicKey: spkPk },
    signedPrekeyId: 1,
    signedPrekeySignature: spkSig,
  };
}

export async function persistOneTimePrekey(keyId: number, keyPair: X25519KeyPair): Promise<void> {
  await saveEncryptedKey(`${OTP_PREFIX}${keyId}`, keyPair.secretKey);
  await saveEncryptedKey(`${OTP_PREFIX}${keyId}:pub`, keyPair.publicKey);
}

export async function loadOneTimePrekey(keyId: number): Promise<X25519KeyPair | null> {
  const sk = await loadEncryptedKey(`${OTP_PREFIX}${keyId}`);
  const pk = await loadEncryptedKey(`${OTP_PREFIX}${keyId}:pub`);
  if (!sk || !pk) return null;
  return { secretKey: sk, publicKey: pk };
}
