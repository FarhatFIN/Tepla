/**
 * Double Ratchet Algorithm — Client-Side Implementation
 *
 * Based on the Signal Protocol specification.
 * Uses libsodium (X25519 DH + XSalsa20-Poly1305 AEAD) and HKDF.
 *
 * State is stored entirely on the client (IndexedDB via storage.ts).
 * The server never holds ratchet keys — it's a blind relay.
 *
 * Key concepts:
 * - DHs: Our current DH ratchet key pair
 * - DHr: Their current DH ratchet public key
 * - RK:  Root key (32 bytes) — used to derive new chain keys on DH ratchet step
 * - CKs: Sending chain key — KDF-stepped for each message
 * - CKr: Receiving chain key
 * - Ns/Nr: Message counters (sending/receiving)
 * - PN: Previous sending chain length (sent in header for skipped messages)
 * - MKSKIPPED: Map of skipped message keys for out-of-order delivery
 */

import sodium from "libsodium-wrappers";
import { HKDF } from "@stablelib/hkdf";
import { SHA256 } from "@stablelib/sha256";
import { generateX25519KeyPair, ensureSodiumReady, type X25519KeyPair } from "./keys";
import { saveEncryptedKey, loadEncryptedKey } from "./storage";

const KDF_INFO_ROOT = new TextEncoder().encode("Tepla/Ratchet/Root/v2");
const KDF_INFO_MSG = new TextEncoder().encode("Tepla/Ratchet/Msg/v2");
const MAX_SKIP = 256; // Max skipped messages to cache per session

const b64 = sodium.base64_variants.URLSAFE_NO_PADDING;

// ─── Types ────────────────────────────────────────────

export interface RatchetState {
  DHs: X25519KeyPair;          // Our ratchet key pair
  DHr: Uint8Array | null;      // Their ratchet public key
  RK: Uint8Array;              // Root key (32 bytes)
  CKs: Uint8Array | null;      // Sending chain key
  CKr: Uint8Array | null;      // Receiving chain key
  Ns: number;                  // Sending message counter
  Nr: number;                  // Receiving message counter
  PN: number;                  // Previous sending chain length
  MKSKIPPED: Map<string, Uint8Array>; // key: `${ratchetPubHex}:${nr}` → messageKey
}

export interface RatchetHeader {
  dh: string;    // base64 — sender's current ratchet public key
  pn: number;    // previous chain length
  n: number;     // message number in current chain
}

export interface RatchetMessage {
  header: RatchetHeader;
  ciphertext: string;  // base64
  nonce: string;        // base64
}

// ─── KDF Functions ────────────────────────────────────

function kdfRK(rk: Uint8Array, dhOut: Uint8Array): { rootKey: Uint8Array; chainKey: Uint8Array } {
  const hkdf = new HKDF(SHA256, dhOut, rk, KDF_INFO_ROOT);
  const okm = hkdf.expand(64);
  return {
    rootKey: okm.slice(0, 32),
    chainKey: okm.slice(32, 64),
  };
}

function kdfCK(ck: Uint8Array): { chainKey: Uint8Array; messageKey: Uint8Array } {
  const hkdf = new HKDF(SHA256, ck, undefined, KDF_INFO_MSG);
  const okm = hkdf.expand(64);
  return {
    chainKey: okm.slice(0, 32),
    messageKey: okm.slice(32, 64),
  };
}

// ─── Session Initialization ──────────────────────────

/**
 * Initialize as the session initiator (Alice).
 * Called after X3DH produces the shared secret.
 */
export async function initSender(
  sharedSecret: Uint8Array,
  theirRatchetPublicKey: Uint8Array
): Promise<RatchetState> {
  await ensureSodiumReady();

  const DHs = await generateX25519KeyPair();
  const dhOut = sodium.crypto_scalarmult(DHs.secretKey, theirRatchetPublicKey);
  const { rootKey, chainKey } = kdfRK(sharedSecret, dhOut);

  return {
    DHs,
    DHr: theirRatchetPublicKey,
    RK: rootKey,
    CKs: chainKey,
    CKr: null,
    Ns: 0,
    Nr: 0,
    PN: 0,
    MKSKIPPED: new Map(),
  };
}

/**
 * Initialize as the session responder (Bob).
 * Bob uses his signed prekey as the initial ratchet key.
 */
export async function initReceiver(
  sharedSecret: Uint8Array,
  ourSignedPrekey: X25519KeyPair
): Promise<RatchetState> {
  await ensureSodiumReady();

  return {
    DHs: ourSignedPrekey,
    DHr: null,
    RK: sharedSecret,
    CKs: null,
    CKr: null,
    Ns: 0,
    Nr: 0,
    PN: 0,
    MKSKIPPED: new Map(),
  };
}

// ─── Encrypt ─────────────────────────────────────────

export async function ratchetEncrypt(
  state: RatchetState,
  plaintext: Uint8Array
): Promise<{ state: RatchetState; message: RatchetMessage }> {
  await ensureSodiumReady();

  if (!state.CKs) throw new Error("Cannot encrypt: no sending chain key");

  const { chainKey, messageKey } = kdfCK(state.CKs);
  const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
  const ciphertext = sodium.crypto_secretbox_easy(plaintext, nonce, messageKey);

  const header: RatchetHeader = {
    dh: sodium.to_base64(state.DHs.publicKey, b64),
    pn: state.PN,
    n: state.Ns,
  };

  const newState: RatchetState = {
    ...state,
    CKs: chainKey,
    Ns: state.Ns + 1,
  };

  return {
    state: newState,
    message: {
      header,
      ciphertext: sodium.to_base64(ciphertext, b64),
      nonce: sodium.to_base64(nonce, b64),
    },
  };
}

// ─── Decrypt ─────────────────────────────────────────

export async function ratchetDecrypt(
  state: RatchetState,
  message: RatchetMessage
): Promise<{ state: RatchetState; plaintext: Uint8Array }> {
  await ensureSodiumReady();

  const theirDH = sodium.from_base64(message.header.dh, b64);

  // Check if this is a skipped message we already cached
  const skipKey = `${message.header.dh}:${message.header.n}`;
  const cachedMK = state.MKSKIPPED.get(skipKey);
  if (cachedMK) {
    const newSkipped = new Map(state.MKSKIPPED);
    newSkipped.delete(skipKey);
    const plaintext = decryptWithKey(cachedMK, message);
    return {
      state: { ...state, MKSKIPPED: newSkipped },
      plaintext,
    };
  }

  let currentState = state;

  // Check if we need a DH ratchet step (new ratchet key from sender)
  const needsDHRatchet =
    !currentState.DHr || !sodium.memcmp(theirDH, currentState.DHr);

  if (needsDHRatchet) {
    // Skip any missed messages from the old chain
    currentState = skipMessageKeys(currentState, message.header.pn);

    // DH ratchet step
    currentState = await dhRatchetStep(currentState, theirDH);
  }

  // Skip any missed messages in the current chain
  currentState = skipMessageKeys(currentState, message.header.n);

  // Derive the message key
  if (!currentState.CKr) throw new Error("Cannot decrypt: no receiving chain key");
  const { chainKey, messageKey } = kdfCK(currentState.CKr);

  const plaintext = decryptWithKey(messageKey, message);

  return {
    state: {
      ...currentState,
      CKr: chainKey,
      Nr: currentState.Nr + 1,
    },
    plaintext,
  };
}

// ─── Internal Helpers ────────────────────────────────

function decryptWithKey(messageKey: Uint8Array, message: RatchetMessage): Uint8Array {
  const nonce = sodium.from_base64(message.nonce, b64);
  const ciphertext = sodium.from_base64(message.ciphertext, b64);
  return sodium.crypto_secretbox_open_easy(ciphertext, nonce, messageKey);
}

function skipMessageKeys(state: RatchetState, until: number): RatchetState {
  if (!state.CKr) return state;
  if (until - state.Nr > MAX_SKIP) {
    throw new Error(`Too many skipped messages (${until - state.Nr} > ${MAX_SKIP})`);
  }

  const newSkipped = new Map(state.MKSKIPPED);
  let ck = state.CKr;
  let nr = state.Nr;
  const dhHex = state.DHr ? sodium.to_base64(state.DHr, b64) : "none";

  while (nr < until) {
    const { chainKey, messageKey } = kdfCK(ck);
    newSkipped.set(`${dhHex}:${nr}`, messageKey);
    ck = chainKey;
    nr++;
  }

  return { ...state, CKr: ck, Nr: nr, MKSKIPPED: newSkipped };
}

async function dhRatchetStep(state: RatchetState, theirDH: Uint8Array): Promise<RatchetState> {
  const PN = state.Ns;

  // Receiving chain: DH with their new key and our current key
  const dhRecv = sodium.crypto_scalarmult(state.DHs.secretKey, theirDH);
  const { rootKey: rk1, chainKey: ckr } = kdfRK(state.RK, dhRecv);

  // Generate new ratchet key pair for sending
  const newDHs = await generateX25519KeyPair();
  const dhSend = sodium.crypto_scalarmult(newDHs.secretKey, theirDH);
  const { rootKey: rk2, chainKey: cks } = kdfRK(rk1, dhSend);

  return {
    ...state,
    DHs: newDHs,
    DHr: theirDH,
    RK: rk2,
    CKs: cks,
    CKr: ckr,
    Ns: 0,
    Nr: 0,
    PN,
  };
}

// ─── Session Persistence (IndexedDB) ─────────────────

const SESSION_PREFIX = "ratchet:session:";

export async function persistSession(sessionId: string, state: RatchetState): Promise<void> {
  const serialized: SerializedRatchetState = {
    DHs_sk: sodium.to_base64(state.DHs.secretKey, b64),
    DHs_pk: sodium.to_base64(state.DHs.publicKey, b64),
    DHr: state.DHr ? sodium.to_base64(state.DHr, b64) : null,
    RK: sodium.to_base64(state.RK, b64),
    CKs: state.CKs ? sodium.to_base64(state.CKs, b64) : null,
    CKr: state.CKr ? sodium.to_base64(state.CKr, b64) : null,
    Ns: state.Ns,
    Nr: state.Nr,
    PN: state.PN,
    skipped: Array.from(state.MKSKIPPED.entries()).map(([k, v]) => [k, sodium.to_base64(v, b64)]),
  };

  const data = new TextEncoder().encode(JSON.stringify(serialized));
  await saveEncryptedKey(`${SESSION_PREFIX}${sessionId}`, data);
}

export async function loadSession(sessionId: string): Promise<RatchetState | null> {
  const data = await loadEncryptedKey(`${SESSION_PREFIX}${sessionId}`);
  if (!data) return null;

  await ensureSodiumReady();
  const serialized: SerializedRatchetState = JSON.parse(new TextDecoder().decode(data));

  return {
    DHs: {
      secretKey: sodium.from_base64(serialized.DHs_sk, b64),
      publicKey: sodium.from_base64(serialized.DHs_pk, b64),
    },
    DHr: serialized.DHr ? sodium.from_base64(serialized.DHr, b64) : null,
    RK: sodium.from_base64(serialized.RK, b64),
    CKs: serialized.CKs ? sodium.from_base64(serialized.CKs, b64) : null,
    CKr: serialized.CKr ? sodium.from_base64(serialized.CKr, b64) : null,
    Ns: serialized.Ns,
    Nr: serialized.Nr,
    PN: serialized.PN,
    MKSKIPPED: new Map(
      serialized.skipped.map(([k, v]) => [k, sodium.from_base64(v as string, b64)])
    ),
  };
}

interface SerializedRatchetState {
  DHs_sk: string;
  DHs_pk: string;
  DHr: string | null;
  RK: string;
  CKs: string | null;
  CKr: string | null;
  Ns: number;
  Nr: number;
  PN: number;
  skipped: [string, string][];
}
