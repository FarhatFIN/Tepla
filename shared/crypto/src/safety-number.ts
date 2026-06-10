/**
 * Safety numbers for manual peer verification (Signal-style numeric fingerprint).
 *
 * Both participants compute the same 60-digit number from the pair of identity
 * signing keys. Comparing it out-of-band (in person, voice call) defeats a
 * MITM that substituted keys, complementing the Key Transparency log.
 */

import { sha256 } from '@noble/hashes/sha2.js';
import { hexToBytes, concatBytes, utf8ToBytes } from '@noble/hashes/utils.js';

const FINGERPRINT_VERSION = new Uint8Array([0x00, 0x01]);
/** Iterated hashing slows down brute-force fingerprint collisions. */
const ITERATIONS = 5200;

function fingerprintDigits(identityKeyHex: string, userId: string): string {
  const keyBytes = hexToBytes(identityKeyHex);
  let data = sha256(concatBytes(FINGERPRINT_VERSION, keyBytes, utf8ToBytes(userId)));
  for (let i = 0; i < ITERATIONS; i++) {
    data = sha256(concatBytes(data, keyBytes));
  }

  // 30 digits: 6 groups of 5, each derived from 5 bytes (40 bits) mod 100000.
  let digits = '';
  for (let g = 0; g < 6; g++) {
    const c = data.subarray(g * 5, g * 5 + 5);
    const num = (c[0] * 2 ** 32 + c[1] * 2 ** 24 + c[2] * 2 ** 16 + c[3] * 2 ** 8 + c[4]) % 100000;
    digits += num.toString().padStart(5, '0');
  }
  return digits;
}

/**
 * Compute the shared 60-digit safety number for a conversation.
 * Symmetric: both sides get the identical result regardless of argument order.
 * Returns 12 space-separated groups of 5 digits.
 */
export function computeSafetyNumber(
  localIdentityKeyHex: string,
  localUserId: string,
  remoteIdentityKeyHex: string,
  remoteUserId: string
): string {
  const local = fingerprintDigits(localIdentityKeyHex, localUserId);
  const remote = fingerprintDigits(remoteIdentityKeyHex, remoteUserId);
  const [first, second] = [local, remote].sort();
  return (first + second).match(/.{5}/g)!.join(' ');
}
