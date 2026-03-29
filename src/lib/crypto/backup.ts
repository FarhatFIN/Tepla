/**
 * Zero-Knowledge Encrypted Backup
 *
 * Recovery phrase (24 words, BIP-39 compatible) → Argon2id → backup_key → AES-GCM(key_bundle)
 * Server stores: encrypted_blob + salt + Argon2id params. NEVER the key.
 *
 * npm: @noble/hashes (SHA-256), hash-wasm (Argon2id — WASM, fast, audited)
 *
 * KDF flow:
 *   recovery_phrase (24 words)
 *     → SHA-256 → 32-byte seed
 *       → Argon2id(seed, salt, m=256MB, t=4, p=2) → 32-byte backup_key
 *         → AES-256-GCM(backup_key, IV, identity_key_bundle) → encrypted_blob
 *
 * Argon2id params chosen to be painful for GPU:
 *   memory = 256MB (forces sequential memory access)
 *   iterations = 4 (slow but tolerable on mobile)
 *   parallelism = 2 (limited CPU benefit for attacker)
 *
 * Production risk: Argon2id with 256MB can OOM on low-end devices.
 * Mitigation: detect device memory, fall back to m=64MB with t=8.
 */

import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import { argon2id } from 'hash-wasm';

// BIP-39 English wordlist (2048 words) — subset for demonstration
// In production: import from 'bip39/wordlists/english'
// npm: bip39
const WORDLIST_SIZE = 2048;

// ─── Recovery Phrase Generation ──────────────────

/**
 * Generate a 24-word recovery phrase from 256 bits of entropy.
 * Compatible with BIP-39 but used for key backup, not HD wallet derivation.
 */
export async function generateRecoveryPhrase(): Promise<string> {
  // 256 bits = 24 words (each word encodes 11 bits, 24 * 11 = 264, 256 + 8 checksum)
  const entropy = crypto.getRandomValues(new Uint8Array(32));
  const checksum = sha256(entropy);

  // Combine entropy + first byte of checksum
  const bits = Array.from(entropy)
    .map(b => b.toString(2).padStart(8, '0'))
    .join('') + checksum[0].toString(2).padStart(8, '0');

  // Dynamically load wordlist
  const { wordlist } = await import('bip39/wordlists/english');

  const words: string[] = [];
  for (let i = 0; i < 24; i++) {
    const index = parseInt(bits.slice(i * 11, (i + 1) * 11), 2);
    words.push(wordlist[index]);
  }

  return words.join(' ');
}

/**
 * Validate a recovery phrase (checksum verification).
 */
export async function validateRecoveryPhrase(phrase: string): Promise<boolean> {
  const { wordlist } = await import('bip39/wordlists/english');
  const words = phrase.trim().toLowerCase().split(/\s+/);
  if (words.length !== 24) return false;

  const indices = words.map(w => wordlist.indexOf(w));
  if (indices.some(i => i === -1)) return false;

  const bits = indices.map(i => i.toString(2).padStart(11, '0')).join('');
  const entropyBits = bits.slice(0, 256);
  const checksumBits = bits.slice(256, 264);

  const entropy = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    entropy[i] = parseInt(entropyBits.slice(i * 8, (i + 1) * 8), 2);
  }

  const checksum = sha256(entropy);
  const expectedChecksum = checksum[0].toString(2).padStart(8, '0');

  return checksumBits === expectedChecksum;
}

// ─── KDF: Phrase → Backup Key ────────────────────

export interface Argon2Params {
  memoryCost: number;   // KB (256 * 1024 = 256MB)
  timeCost: number;     // iterations
  parallelism: number;
  hashLength: number;   // bytes
}

const DEFAULT_PARAMS: Argon2Params = {
  memoryCost: 256 * 1024,  // 256MB
  timeCost: 4,
  parallelism: 2,
  hashLength: 32,
};

const LOW_MEMORY_PARAMS: Argon2Params = {
  memoryCost: 64 * 1024,   // 64MB fallback for low-end devices
  timeCost: 8,
  parallelism: 2,
  hashLength: 32,
};

function detectParams(): Argon2Params {
  if (typeof navigator !== 'undefined' && 'deviceMemory' in navigator) {
    const mem = (navigator as any).deviceMemory as number;
    if (mem < 2) return LOW_MEMORY_PARAMS; // < 2GB RAM device
  }
  return DEFAULT_PARAMS;
}

/**
 * Derive backup key from recovery phrase using Argon2id.
 */
export async function deriveBackupKey(
  phrase: string,
  salt: Uint8Array,
  params?: Argon2Params
): Promise<Uint8Array> {
  const p = params || detectParams();

  // SHA-256 the phrase to get a fixed-size seed
  const seed = sha256(new TextEncoder().encode(phrase.trim().toLowerCase()));

  const result = await argon2id({
    password: seed,
    salt,
    memoryCost: p.memoryCost,
    timeCost: p.timeCost,
    parallelism: p.parallelism,
    hashLength: p.hashLength,
    outputType: 'binary',
  });

  return new Uint8Array(result);
}

// ─── Encrypt / Decrypt Key Bundle ────────────────

export interface EncryptedBackup {
  encryptedBlob: string;   // base64
  iv: string;              // base64
  salt: string;            // hex
  argon2Params: Argon2Params;
  version: number;
}

/**
 * Encrypt the identity key bundle for backup.
 * Uses AES-256-GCM (WebCrypto).
 */
export async function encryptBackup(
  backupKey: Uint8Array,
  keyBundle: Uint8Array     // serialized identity keys + ratchet state
): Promise<EncryptedBackup> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const salt = crypto.getRandomValues(new Uint8Array(32));
  const params = detectParams();

  // Import key for AES-GCM
  const key = await crypto.subtle.importKey(
    'raw',
    backupKey,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    keyBundle
  );

  return {
    encryptedBlob: uint8ToBase64(new Uint8Array(ciphertext)),
    iv: uint8ToBase64(iv),
    salt: bytesToHex(salt),
    argon2Params: params,
    version: 1,
  };
}

/**
 * Decrypt a backup to recover the key bundle.
 */
export async function decryptBackup(
  phrase: string,
  backup: EncryptedBackup
): Promise<Uint8Array> {
  const salt = hexToBytes(backup.salt);
  const backupKey = await deriveBackupKey(phrase, salt, backup.argon2Params);

  const key = await crypto.subtle.importKey(
    'raw',
    backupKey,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );

  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToUint8(backup.iv) },
    key,
    base64ToUint8(backup.encryptedBlob)
  );

  return new Uint8Array(plaintext);
}

// ─── Full Backup Flow ────────────────────────────

/**
 * Create a backup:
 * 1. Generate (or accept existing) recovery phrase
 * 2. Generate random salt
 * 3. Derive backup key via Argon2id
 * 4. Encrypt key bundle with AES-256-GCM
 * 5. Upload { encrypted_blob, salt, params } to server
 */
export async function createBackup(
  phrase: string,
  keyBundle: Uint8Array,
  apiBase: string,
  authToken: string
): Promise<void> {
  const salt = crypto.getRandomValues(new Uint8Array(32));
  const params = detectParams();
  const backupKey = await deriveBackupKey(phrase, salt, params);
  const backup = await encryptBackup(backupKey, keyBundle);

  // Upload to server — server stores only the encrypted blob
  await fetch(`${apiBase}/api/backup/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(backup),
  });
}

/**
 * Restore from backup:
 * 1. Download encrypted blob from server
 * 2. User enters recovery phrase
 * 3. Derive backup key
 * 4. Decrypt and restore key bundle
 */
export async function restoreBackup(
  phrase: string,
  apiBase: string,
  authToken: string
): Promise<Uint8Array> {
  const res = await fetch(`${apiBase}/api/backup/download`, {
    headers: { 'Authorization': `Bearer ${authToken}` },
  });

  if (!res.ok) throw new Error('No backup found');
  const { data: backup } = await res.json();

  return decryptBackup(phrase, backup);
}

/**
 * Rotation: create new backup after key change without exposing old keys.
 * Simply re-encrypts the current key bundle with the same phrase + new salt.
 * Old backup is overwritten on the server.
 */
export async function rotateBackup(
  phrase: string,
  newKeyBundle: Uint8Array,
  apiBase: string,
  authToken: string
): Promise<void> {
  // Same as createBackup — new salt means old backup_key is useless
  await createBackup(phrase, newKeyBundle, apiBase, authToken);
}

// ─── Helpers ─────────────────────────────────────

function uint8ToBase64(buf: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < buf.length; i++) binary += String.fromCharCode(buf[i]);
  return btoa(binary);
}

function base64ToUint8(b64str: string): Uint8Array {
  const binary = atob(b64str);
  const buf = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) buf[i] = binary.charCodeAt(i);
  return buf;
}
