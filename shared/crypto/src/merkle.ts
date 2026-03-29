/**
 * Merkle Tree for Key Transparency log.
 *
 * Append-only binary hash tree. Each leaf = SHA-256(userId || identityKey || timestamp).
 * Server stores the tree; clients verify inclusion proofs without trusting the server.
 *
 * npm: @noble/hashes (pure JS, audited, no native deps)
 */

import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex, hexToBytes, concatBytes } from '@noble/hashes/utils';

const LEAF_PREFIX = new Uint8Array([0x00]);
const NODE_PREFIX = new Uint8Array([0x01]);

export type MerkleProof = {
  leafIndex: number;
  leafHash: string;       // hex
  siblings: string[];     // hex, bottom-to-top
  directions: number[];   // 0 = left, 1 = right
  treeSize: number;
  rootHash: string;       // hex — signed tree head
};

export type SignedTreeHead = {
  treeSize: number;
  rootHash: string;
  timestamp: string;      // ISO 8601
  signature: string;      // hex — Ed25519 over (treeSize || rootHash || timestamp)
};

// ─── Hash Functions ──────────────────────────────

/** Hash a leaf: H(0x00 || data) */
export function hashLeaf(data: Uint8Array): Uint8Array {
  return sha256(concatBytes(LEAF_PREFIX, data));
}

/** Hash two children: H(0x01 || left || right) */
export function hashNode(left: Uint8Array, right: Uint8Array): Uint8Array {
  return sha256(concatBytes(NODE_PREFIX, left, right));
}

/** Create leaf data from a key transparency entry */
export function createLeafData(userId: string, identityKeyHex: string, timestamp: string): Uint8Array {
  const encoder = new TextEncoder();
  return concatBytes(
    encoder.encode(userId),
    hexToBytes(identityKeyHex),
    encoder.encode(timestamp)
  );
}

// ─── Server-Side: Build Tree ─────────────────────

/**
 * Compute Merkle root from an array of leaf hashes.
 * Returns all intermediate hashes for proof generation.
 */
export function buildTree(leafHashes: Uint8Array[]): {
  root: Uint8Array;
  layers: Uint8Array[][];
} {
  if (leafHashes.length === 0) {
    return { root: new Uint8Array(32), layers: [] };
  }

  const layers: Uint8Array[][] = [leafHashes.slice()];

  // Pad to power of 2 with zero hashes
  let current = leafHashes.slice();
  while (current.length > 1) {
    if (current.length % 2 !== 0) {
      current.push(new Uint8Array(32)); // empty node
    }
    const next: Uint8Array[] = [];
    for (let i = 0; i < current.length; i += 2) {
      next.push(hashNode(current[i], current[i + 1]));
    }
    layers.push(next);
    current = next;
  }

  return { root: current[0], layers };
}

/**
 * Generate an inclusion proof for a leaf at `index`.
 */
export function generateProof(
  layers: Uint8Array[][],
  index: number,
  treeSize: number
): MerkleProof {
  const siblings: string[] = [];
  const directions: number[] = [];
  let idx = index;

  for (let level = 0; level < layers.length - 1; level++) {
    const layer = layers[level];
    const isRight = idx % 2 === 1;
    const siblingIdx = isRight ? idx - 1 : idx + 1;

    if (siblingIdx < layer.length) {
      siblings.push(bytesToHex(layer[siblingIdx]));
      directions.push(isRight ? 1 : 0);
    } else {
      siblings.push(bytesToHex(new Uint8Array(32)));
      directions.push(0);
    }

    idx = Math.floor(idx / 2);
  }

  return {
    leafIndex: index,
    leafHash: bytesToHex(layers[0][index]),
    siblings,
    directions,
    treeSize,
    rootHash: bytesToHex(layers[layers.length - 1][0]),
  };
}

// ─── Client-Side: Verify Proof ───────────���───────

/**
 * Verify a Merkle inclusion proof. Runs entirely on the client.
 * Returns true if the proof is valid against the given root hash.
 *
 * CRITICAL: Client must also verify the SignedTreeHead signature
 * and compare rootHash against the last-known root (consistency check).
 */
export function verifyProof(proof: MerkleProof): boolean {
  let hash = hexToBytes(proof.leafHash);

  for (let i = 0; i < proof.siblings.length; i++) {
    const sibling = hexToBytes(proof.siblings[i]);
    if (proof.directions[i] === 1) {
      // We are right child
      hash = hashNode(sibling, hash);
    } else {
      // We are left child
      hash = hashNode(hash, sibling);
    }
  }

  return bytesToHex(hash) === proof.rootHash;
}

/**
 * Verify that a new tree head is consistent with a previous one.
 * The new tree must contain all leaves from the old tree in the same order.
 *
 * For self-audit: compare stored STH with newly received STH.
 * If treeSize decreased or rootHash doesn't match — the server is lying.
 */
export function verifyConsistency(
  oldHead: SignedTreeHead,
  newHead: SignedTreeHead
): { valid: boolean; reason?: string } {
  if (newHead.treeSize < oldHead.treeSize) {
    return { valid: false, reason: 'Tree size decreased — log has been truncated' };
  }
  if (newHead.treeSize === oldHead.treeSize && newHead.rootHash !== oldHead.rootHash) {
    return { valid: false, reason: 'Same size but different root — log has been rewritten' };
  }
  // Full consistency proof requires the server to provide a path between old and new roots.
  // For self-audit v1, we accept monotonic growth + matching roots when size matches.
  return { valid: true };
}
