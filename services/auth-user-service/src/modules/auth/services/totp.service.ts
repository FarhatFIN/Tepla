import crypto from 'crypto';

/**
 * RFC 4226 / 6238 TOTP, plus the base32 codec authenticator apps expect.
 *
 * Extracted from `auth.routes.ts` (which had grown past 1800 lines) so the
 * algorithm can be unit tested against the RFC vectors without standing up
 * Express, Redis, Kafka and Postgres.
 */

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

export function base32Decode(encoded: string): Buffer {
  const cleaned = encoded.replace(/=+$/, '').toUpperCase();
  let bits = 0;
  let value = 0;
  const output: number[] = [];
  for (const char of cleaned) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(output);
}

export function generateHOTP(secret: string, counter: number): string {
  const decodedSecret = base32Decode(secret);
  const buffer = Buffer.alloc(8);
  // Write the counter big-endian across all 8 bytes. `writeBigUInt64BE` keeps
  // this correct past 2^32, unlike the 32-bit shift loop it replaces.
  buffer.writeBigUInt64BE(BigInt(counter));

  const hmacResult = crypto.createHmac('sha1', decodedSecret).update(buffer).digest();
  const offset = hmacResult[hmacResult.length - 1] & 0xf;
  const code =
    ((hmacResult[offset] & 0x7f) << 24) |
    ((hmacResult[offset + 1] & 0xff) << 16) |
    ((hmacResult[offset + 2] & 0xff) << 8) |
    (hmacResult[offset + 3] & 0xff);
  return (code % 1_000_000).toString().padStart(6, '0');
}

/**
 * Return the counter step `code` matches within ±`window`, or null.
 *
 * The caller needs the counter — not just a boolean — so it can record the step
 * as spent and make each code single-use (otherwise the same six digits stay
 * valid for the whole ±1-step window, i.e. up to 90 seconds of replay).
 *
 * Comparison is constant-time and the loop does not break early, so response
 * timing does not reveal how many digits were correct or which step matched.
 */
export function matchTotpCounter(
  secret: string,
  code: string,
  window = 1,
  now: number = Date.now(),
): number | null {
  if (!/^\d{6}$/.test(code)) return null;

  const counter = Math.floor(now / 30_000);
  const supplied = Buffer.from(code, 'utf8');
  let match: number | null = null;

  for (let i = -window; i <= window; i++) {
    const expected = Buffer.from(generateHOTP(secret, counter + i), 'utf8');
    if (expected.length === supplied.length && crypto.timingSafeEqual(expected, supplied)) {
      match = counter + i;
    }
  }

  return match;
}

export function verifyTotp(secret: string, code: string, window = 1, now: number = Date.now()): boolean {
  return matchTotpCounter(secret, code, window, now) !== null;
}

/** DER prefix for an Ed25519 SubjectPublicKeyInfo (RFC 8410). */
const ED25519_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');

/**
 * Verify an Ed25519 signature over `message` using a raw 32-byte base64 key.
 *
 * `crypto.verify` will not accept a bare key — it needs a KeyObject or DER/PEM —
 * so the raw key must be wrapped in an SPKI envelope first. Passing the bare
 * buffer (as the biometric login handler used to) throws, which is why that
 * endpoint could never succeed.
 */
export function verifyEd25519(publicKeyBase64: string, message: Buffer, signatureBase64: string): boolean {
  try {
    const rawKey = Buffer.from(publicKeyBase64, 'base64');
    if (rawKey.length !== 32) return false;

    const signature = Buffer.from(signatureBase64, 'base64');
    if (signature.length !== 64) return false;

    const key = crypto.createPublicKey({
      key: Buffer.concat([ED25519_SPKI_PREFIX, rawKey]),
      format: 'der',
      type: 'spki',
    });

    return crypto.verify(null, message, key, signature);
  } catch {
    return false;
  }
}

/** Normalise a phone number to E.164-ish form (RU leading-8 shorthand aware). */
export function normalizePhone(phone: string): string {
  return phone.replace(/[^\d+]/g, '').replace(/^8/, '+7');
}

export function maskPhone(phone: string): string {
  if (phone.length < 6) return '***';
  return phone.slice(0, 4) + '****' + phone.slice(-2);
}

export function maskEmail(email: string): string {
  const at = email.indexOf('@');
  if (at < 1) return '***';
  const local = email.slice(0, at);
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}***${email.slice(at)}`;
}
