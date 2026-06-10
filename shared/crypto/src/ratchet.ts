/**
 * Double Ratchet (Signal-style) for Tepla secret chats.
 *
 * Guarantees:
 * - Forward secrecy: every message is encrypted with a fresh one-time key
 * - Post-compromise security: each DH ratchet step heals a compromised state
 * - Out-of-order delivery: skipped message keys are cached (bounded by MAX_SKIP)
 * - Replay protection: message keys are deleted after use; replays throw
 *
 * The state object is plain JSON — the client must persist it (e.g. IndexedDB)
 * after EVERY encrypt/decrypt call. All functions mutate the state in place.
 *
 * AEAD: ChaCha20-Poly1305 with the message header bound as associated data.
 *
 * npm: @noble/curves, @noble/ciphers, @noble/hashes (pure JS, audited)
 */

import { x25519 } from '@noble/curves/ed25519.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { hkdf } from '@noble/hashes/hkdf.js';
import { hmac } from '@noble/hashes/hmac.js';
import { bytesToHex, hexToBytes, utf8ToBytes } from '@noble/hashes/utils.js';
import { chacha20poly1305 } from '@noble/ciphers/chacha.js';
import { generateDHKeyPair, type DHKeyPair } from './x3dh';

const ROOT_INFO = 'Tepla-Ratchet-Root-v1';
const MSG_INFO = 'Tepla-Ratchet-Msg-v1';
/** Max number of message keys cached for out-of-order delivery. */
const MAX_SKIP = 1000;

export type MessageHeader = {
  /** Sender's current ratchet public key (hex) */
  dh: string;
  /** Number of messages in the sender's previous sending chain */
  pn: number;
  /** Index of this message in the current sending chain (monotonic counter) */
  n: number;
};

export type EncryptedMessage = {
  header: MessageHeader;
  ciphertext: string; // hex
};

/** JSON-serializable ratchet state. Persist after every operation. */
export type RatchetState = {
  rootKey: string;                  // hex, 32 bytes
  dhSend: DHKeyPair;                // our current ratchet keypair
  dhRemote: string | null;          // their current ratchet public key
  chainKeySend: string | null;
  chainKeyRecv: string | null;
  sendCount: number;                // Ns
  recvCount: number;                // Nr
  prevSendCount: number;            // PN
  /** `${dhPubHex}:${n}` -> message key hex. Keys are one-time use. */
  skipped: Record<string, string>;
};

// ─── KDFs ────────────────────────────────────────

function kdfRoot(rootKey: Uint8Array, dhOutput: Uint8Array): [Uint8Array, Uint8Array] {
  const okm = hkdf(sha256, dhOutput, rootKey, ROOT_INFO, 64);
  return [okm.slice(0, 32), okm.slice(32, 64)];
}

function kdfChain(chainKey: Uint8Array): { messageKey: Uint8Array; nextChainKey: Uint8Array } {
  return {
    messageKey: hmac(sha256, chainKey, new Uint8Array([0x01])),
    nextChainKey: hmac(sha256, chainKey, new Uint8Array([0x02])),
  };
}

// ─── AEAD ────────────────────────────────────────

function headerAad(header: MessageHeader): Uint8Array {
  return utf8ToBytes(`${header.dh}:${header.pn}:${header.n}`);
}

function seal(messageKey: Uint8Array, header: MessageHeader, plaintext: Uint8Array): Uint8Array {
  const okm = hkdf(sha256, messageKey, new Uint8Array(32), MSG_INFO, 44);
  return chacha20poly1305(okm.slice(0, 32), okm.slice(32, 44), headerAad(header)).encrypt(plaintext);
}

function open(messageKey: Uint8Array, header: MessageHeader, ciphertext: Uint8Array): Uint8Array {
  const okm = hkdf(sha256, messageKey, new Uint8Array(32), MSG_INFO, 44);
  // Throws on authentication failure — tampered header or ciphertext.
  return chacha20poly1305(okm.slice(0, 32), okm.slice(32, 44), headerAad(header)).decrypt(ciphertext);
}

// ─── Initialization ──────────────────────────────

/**
 * Initialize as the X3DH initiator (Alice).
 * `remoteRatchetKey` is the responder's signed prekey public key.
 */
export function initSender(sharedSecret: Uint8Array, remoteRatchetKey: string): RatchetState {
  const dhSend = generateDHKeyPair();
  const dhOut = x25519.getSharedSecret(hexToBytes(dhSend.secretKey), hexToBytes(remoteRatchetKey));
  const [rootKey, chainKeySend] = kdfRoot(sharedSecret, dhOut);

  return {
    rootKey: bytesToHex(rootKey),
    dhSend,
    dhRemote: remoteRatchetKey,
    chainKeySend: bytesToHex(chainKeySend),
    chainKeyRecv: null,
    sendCount: 0,
    recvCount: 0,
    prevSendCount: 0,
    skipped: {},
  };
}

/**
 * Initialize as the X3DH responder (Bob).
 * `ourRatchetKeyPair` is his signed prekey keypair (per the Signal spec).
 */
export function initReceiver(sharedSecret: Uint8Array, ourRatchetKeyPair: DHKeyPair): RatchetState {
  return {
    rootKey: bytesToHex(sharedSecret),
    dhSend: ourRatchetKeyPair,
    dhRemote: null,
    chainKeySend: null,
    chainKeyRecv: null,
    sendCount: 0,
    recvCount: 0,
    prevSendCount: 0,
    skipped: {},
  };
}

// ─── Encrypt / Decrypt ───────────────────────────

export function ratchetEncrypt(state: RatchetState, plaintext: Uint8Array): EncryptedMessage {
  if (!state.chainKeySend) {
    throw new Error('Sending chain not initialized — receive a message first to complete the handshake');
  }

  const { messageKey, nextChainKey } = kdfChain(hexToBytes(state.chainKeySend));
  state.chainKeySend = bytesToHex(nextChainKey);

  const header: MessageHeader = {
    dh: state.dhSend.publicKey,
    pn: state.prevSendCount,
    n: state.sendCount,
  };
  state.sendCount++;

  return { header, ciphertext: bytesToHex(seal(messageKey, header, plaintext)) };
}

export function ratchetDecrypt(state: RatchetState, message: EncryptedMessage): Uint8Array {
  const { header } = message;

  // 1. Out-of-order message whose key was cached earlier.
  const skippedKey = `${header.dh}:${header.n}`;
  const cached = state.skipped[skippedKey];
  if (cached) {
    delete state.skipped[skippedKey]; // one-time use — a replay of this message will fail below
    return open(hexToBytes(cached), header, hexToBytes(message.ciphertext));
  }

  // 2. New remote ratchet key — perform a DH ratchet step.
  if (header.dh !== state.dhRemote) {
    skipMessageKeys(state, header.pn); // cache remaining keys of the old receiving chain
    dhRatchetStep(state, header.dh);
  } else if (header.n < state.recvCount) {
    // 3. Counter went backwards and the key is not cached — replay attack.
    throw new Error('Replay detected: message key already consumed');
  }

  // 4. Cache keys for any skipped messages, then derive this message's key.
  skipMessageKeys(state, header.n);
  const { messageKey, nextChainKey } = kdfChain(hexToBytes(state.chainKeyRecv!));
  state.chainKeyRecv = bytesToHex(nextChainKey);
  state.recvCount++;

  return open(messageKey, header, hexToBytes(message.ciphertext));
}

// ─── Internals ───────────────────────────────────

function skipMessageKeys(state: RatchetState, until: number): void {
  if (!state.chainKeyRecv || state.recvCount >= until) return;
  if (until - state.recvCount > MAX_SKIP) {
    throw new Error(`Too many skipped messages (${until - state.recvCount} > ${MAX_SKIP})`);
  }

  while (state.recvCount < until) {
    const { messageKey, nextChainKey } = kdfChain(hexToBytes(state.chainKeyRecv));
    state.skipped[`${state.dhRemote}:${state.recvCount}`] = bytesToHex(messageKey);
    state.chainKeyRecv = bytesToHex(nextChainKey);
    state.recvCount++;

    // Bound the cache: evict the oldest cached key if over the limit.
    const keys = Object.keys(state.skipped);
    if (keys.length > MAX_SKIP) delete state.skipped[keys[0]];
  }
}

function dhRatchetStep(state: RatchetState, remotePub: string): void {
  state.prevSendCount = state.sendCount;
  state.sendCount = 0;
  state.recvCount = 0;
  state.dhRemote = remotePub;

  // Receiving chain from our current ratchet key + their new key.
  const [rk1, chainKeyRecv] = kdfRoot(
    hexToBytes(state.rootKey),
    x25519.getSharedSecret(hexToBytes(state.dhSend.secretKey), hexToBytes(remotePub))
  );
  state.chainKeyRecv = bytesToHex(chainKeyRecv);

  // Fresh ratchet keypair → new sending chain (post-compromise security).
  state.dhSend = generateDHKeyPair();
  const [rk2, chainKeySend] = kdfRoot(
    rk1,
    x25519.getSharedSecret(hexToBytes(state.dhSend.secretKey), hexToBytes(remotePub))
  );
  state.rootKey = bytesToHex(rk2);
  state.chainKeySend = bytesToHex(chainKeySend);
}
