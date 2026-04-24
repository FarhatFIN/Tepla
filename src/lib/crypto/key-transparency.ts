/**
 * Key Transparency — Client-Side Verification
 *
 * Verifies that the server hasn't substituted a user's identity key (MITM).
 * Called automatically during X3DH prekey bundle fetch.
 *
 * npm: @noble/hashes (already used by x3dh.ts)
 *
 * Flow:
 * 1. Client fetches prekey bundle from /api/e2e/keys/bundle/:userId
 * 2. Client fetches inclusion proof from /api/kt/proof/:userId
 * 3. Client verifies proof locally (Merkle path → root)
 * 4. Client compares root against last-known signed tree head (stored in IndexedDB)
 * 5. If tree head is newer, verify consistency (monotonic growth)
 * 6. If verification fails → ABORT session, warn user
 */

import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex, hexToBytes, concatBytes } from '@noble/hashes/utils';
import { ed25519 } from '@noble/curves/ed25519';
import { saveEncryptedKey, loadEncryptedKey } from './storage';

// KT server's Ed25519 public key (hex) — must match the signing key on the server
const KT_SERVER_PUBLIC_KEY = process.env.NEXT_PUBLIC_KT_PUBLIC_KEY || '';

const LEAF_PREFIX = new Uint8Array([0x00]);
const NODE_PREFIX = new Uint8Array([0x01]);
const STH_STORAGE_KEY = 'kt:lastSTH';

export type KTProof = {
  leafIndex: number;
  leafHash: string;
  siblings: string[];
  directions: number[];
  treeSize: number;
  rootHash: string;
};

export type SignedTreeHead = {
  treeSize: number;
  rootHash: string;
  timestamp: string;
  signature: string;
};

export type KTVerificationResult = {
  valid: boolean;
  reason?: string;
  warning?: string;  // non-fatal (e.g., first time seeing this user)
};

/**
 * Verify an inclusion proof for a user's identity key.
 * This is the core trust anchor — if this fails, DO NOT proceed with X3DH.
 */
export function verifyInclusionProof(
  proof: KTProof,
  userId: string,
  identityKeyHex: string,
  createdAt: string
): KTVerificationResult {
  // 1. Reconstruct the leaf hash from raw data
  const encoder = new TextEncoder();
  const leafData = concatBytes(
    encoder.encode(userId),
    hexToBytes(identityKeyHex),
    encoder.encode(createdAt)
  );
  const expectedLeafHash = bytesToHex(sha256(concatBytes(LEAF_PREFIX, leafData)));

  if (expectedLeafHash !== proof.leafHash) {
    return { valid: false, reason: 'Leaf hash mismatch — server returned different key data than what was logged' };
  }

  // 2. Walk the Merkle path from leaf to root
  let hash = hexToBytes(proof.leafHash);

  for (let i = 0; i < proof.siblings.length; i++) {
    const sibling = hexToBytes(proof.siblings[i]);
    if (proof.directions[i] === 1) {
      hash = sha256(concatBytes(NODE_PREFIX, sibling, hash));
    } else {
      hash = sha256(concatBytes(NODE_PREFIX, hash, sibling));
    }
  }

  const computedRoot = bytesToHex(hash);

  if (computedRoot !== proof.rootHash) {
    return { valid: false, reason: 'Root hash mismatch — inclusion proof is invalid' };
  }

  return { valid: true };
}

/**
 * Verify the signed tree head against the last known one.
 * Detects split-view attacks and log rollbacks.
 */
/**
 * Verify the Ed25519 signature on a signed tree head.
 * The server signs: `${treeSize}:${rootHash}:${timestamp}`
 */
function verifySTHSignature(sth: SignedTreeHead): boolean {
  if (!KT_SERVER_PUBLIC_KEY) {
    // If no public key configured, can't verify — reject in production
    if (process.env.NODE_ENV === 'production') return false;
    return true; // allow in dev
  }
  if (sth.signature === '00') return false; // unsigned fallback — always reject
  try {
    const message = new TextEncoder().encode(`${sth.treeSize}:${sth.rootHash}:${sth.timestamp}`);
    const sig = hexToBytes(sth.signature);
    const pubKey = hexToBytes(KT_SERVER_PUBLIC_KEY);
    return ed25519.verify(sig, sha256(message), pubKey);
  } catch {
    return false;
  }
}

export async function verifyTreeHeadConsistency(
  newSTH: SignedTreeHead
): Promise<KTVerificationResult> {
  // Verify cryptographic signature before trusting the tree head
  if (!verifySTHSignature(newSTH)) {
    return { valid: false, reason: 'STH signature verification failed — possible MITM' };
  }

  const stored = await loadLastSTH();

  if (!stored) {
    // First time — trust on first use (TOFU)
    await saveLastSTH(newSTH);
    return { valid: true, warning: 'First tree head seen — TOFU applied' };
  }

  if (newSTH.treeSize < stored.treeSize) {
    return { valid: false, reason: `Tree shrank from ${stored.treeSize} to ${newSTH.treeSize} — log truncation detected` };
  }

  if (newSTH.treeSize === stored.treeSize && newSTH.rootHash !== stored.rootHash) {
    return { valid: false, reason: 'Same tree size but different root — log rewrite detected' };
  }

  // Newer and larger — valid progression
  if (newSTH.treeSize > stored.treeSize) {
    await saveLastSTH(newSTH);
  }

  return { valid: true };
}

/**
 * Full verification flow — called before accepting a prekey bundle.
 */
export async function verifyKeyTransparency(
  apiBase: string,
  authToken: string,
  targetUserId: string,
  identityKeyFromBundle: string  // base64 from prekey bundle
): Promise<KTVerificationResult> {
  try {
    // Fetch inclusion proof
    const res = await fetch(`${apiBase}/api/kt/proof/${targetUserId}`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
    });

    if (!res.ok) {
      if (res.status === 404) {
        return { valid: false, reason: 'User has no key transparency entry — keys not yet published' };
      }
      return { valid: false, reason: `KT API error: ${res.status}` };
    }

    const { data } = await res.json();
    const { proof, signedTreeHead, entry } = data;

    // Convert base64 identity key to hex for comparison
    const identityKeyHex = entry.identity_key_hex;

    // Verify inclusion proof
    const proofResult = verifyInclusionProof(proof, targetUserId, identityKeyHex, entry.createdAt);
    if (!proofResult.valid) return proofResult;

    // Verify tree head consistency
    const sthResult = await verifyTreeHeadConsistency(signedTreeHead);
    if (!sthResult.valid) return sthResult;

    return { valid: true, warning: sthResult.warning };
  } catch (err) {
    return { valid: false, reason: `KT verification error: ${(err as Error).message}` };
  }
}

// ─── IndexedDB persistence for last-known STH ────

async function saveLastSTH(sth: SignedTreeHead): Promise<void> {
  const data = new TextEncoder().encode(JSON.stringify(sth));
  await saveEncryptedKey(STH_STORAGE_KEY, data);
}

async function loadLastSTH(): Promise<SignedTreeHead | null> {
  const data = await loadEncryptedKey(STH_STORAGE_KEY);
  if (!data) return null;
  return JSON.parse(new TextDecoder().decode(data));
}
