import { describe, expect, it } from 'vitest';
import {
  base32Decode,
  base32Encode,
  generateHOTP,
  matchTotpCounter,
  maskEmail,
  maskPhone,
  normalizePhone,
  verifyEd25519,
  verifyTotp,
} from '../../services/auth-user-service/src/modules/auth/services/totp.service';
import { generateKeyPairSync, sign } from 'node:crypto';

describe('base32 codec', () => {
  it('round-trips arbitrary bytes', () => {
    const secret = Buffer.from('12345678901234567890', 'utf8');
    expect(base32Decode(base32Encode(secret)).equals(secret)).toBe(true);
  });

  it('matches the RFC 4648 vectors', () => {
    expect(base32Encode(Buffer.from('foobar', 'utf8'))).toBe('MZXW6YTBOI');
    expect(base32Decode('MZXW6YTBOI').toString('utf8')).toBe('foobar');
  });

  it('ignores padding and case when decoding', () => {
    expect(base32Decode('mzxw6ytboi======').toString('utf8')).toBe('foobar');
  });
});

describe('generateHOTP', () => {
  // RFC 4226 Appendix D, secret "12345678901234567890".
  const secret = base32Encode(Buffer.from('12345678901234567890', 'utf8'));
  const expected = ['755224', '287082', '359152', '969429', '338314', '254676', '287922', '162583', '399871', '520489'];

  it.each(expected.map((code, counter) => [counter, code]))(
    'produces the RFC 4226 vector for counter %i',
    (counter, code) => {
      expect(generateHOTP(secret, counter as number)).toBe(code);
    },
  );

  it('always returns six digits, zero-padded', () => {
    for (let counter = 0; counter < 200; counter++) {
      expect(generateHOTP(secret, counter)).toMatch(/^\d{6}$/);
    }
  });

  it('handles counters beyond 2^32', () => {
    // The old implementation built the counter with 32-bit shifts, which
    // silently truncated. writeBigUInt64BE keeps all 8 bytes meaningful.
    expect(() => generateHOTP(secret, 2 ** 33)).not.toThrow();
    expect(generateHOTP(secret, 2 ** 33)).toMatch(/^\d{6}$/);
  });
});

describe('matchTotpCounter (C-07 — single-use codes)', () => {
  const secret = base32Encode(Buffer.from('12345678901234567890', 'utf8'));
  const now = 1_700_000_000_000;
  const step = Math.floor(now / 30_000);

  it('returns the exact counter step so the caller can burn it', () => {
    // A boolean was not enough: without the step there is nothing to record,
    // and the same six digits stay valid for the whole ±1 window (~90s).
    const code = generateHOTP(secret, step);
    expect(matchTotpCounter(secret, code, 1, now)).toBe(step);
  });

  it('accepts the previous and next step inside the window', () => {
    expect(matchTotpCounter(secret, generateHOTP(secret, step - 1), 1, now)).toBe(step - 1);
    expect(matchTotpCounter(secret, generateHOTP(secret, step + 1), 1, now)).toBe(step + 1);
  });

  it('rejects a code from outside the window', () => {
    expect(matchTotpCounter(secret, generateHOTP(secret, step - 5), 1, now)).toBeNull();
  });

  it('rejects malformed codes without touching the HMAC', () => {
    for (const bad of ['', '12345', '1234567', 'abcdef', '12 456', '-12345']) {
      expect(matchTotpCounter(secret, bad, 1, now)).toBeNull();
    }
  });

  it('verifyTotp stays a thin boolean wrapper', () => {
    expect(verifyTotp(secret, generateHOTP(secret, step), 1, now)).toBe(true);
    expect(verifyTotp(secret, '000000', 1, now)).toBe(
      generateHOTP(secret, step) === '000000'
        || generateHOTP(secret, step - 1) === '000000'
        || generateHOTP(secret, step + 1) === '000000',
    );
  });
});

describe('verifyEd25519 (H-15)', () => {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  // The client stores/sends the bare 32-byte key, base64-encoded — the last 32
  // bytes of the SPKI encoding, with the 12-byte Ed25519 prefix stripped.
  const publicB64 = publicKey.export({ format: 'der', type: 'spki' }).subarray(-32).toString('base64');

  it('verifies a genuine signature over a raw base64 key', () => {
    // The old code passed this bare buffer straight to crypto.verify, which
    // requires a KeyObject or DER — so it threw and biometric login could
    // never have worked at all.
    const message = Buffer.from('user:device:nonce', 'utf8');
    const signature = sign(null, message, privateKey).toString('base64');
    expect(verifyEd25519(publicB64, message, signature)).toBe(true);
  });

  it('rejects a signature over a different message', () => {
    const signature = sign(null, Buffer.from('other', 'utf8'), privateKey).toString('base64');
    expect(verifyEd25519(publicB64, Buffer.from('user:device:nonce', 'utf8'), signature)).toBe(false);
  });

  it('rejects a signature from a different key', () => {
    const other = generateKeyPairSync('ed25519');
    const message = Buffer.from('user:device:nonce', 'utf8');
    const signature = sign(null, message, other.privateKey).toString('base64');
    expect(verifyEd25519(publicB64, message, signature)).toBe(false);
  });

  it('returns false rather than throwing on malformed input', () => {
    const message = Buffer.from('m', 'utf8');
    expect(verifyEd25519('', message, '')).toBe(false);
    expect(verifyEd25519('not-base64!!', message, 'also-bad')).toBe(false);
    expect(verifyEd25519(Buffer.alloc(16).toString('base64'), message, Buffer.alloc(64).toString('base64'))).toBe(false);
    expect(verifyEd25519(publicB64, message, Buffer.alloc(32).toString('base64'))).toBe(false);
  });
});

describe('masking helpers', () => {
  it('masks emails without revealing the local part', () => {
    expect(maskEmail('alice@example.com')).toBe('al***@example.com');
    expect(maskEmail('a@example.com')).toBe('a***@example.com');
  });

  it('does not throw on input that is not an address', () => {
    expect(maskEmail('nonsense')).toBe('***');
    expect(maskEmail('@nolocal.com')).toBe('***');
  });

  it('masks phone numbers', () => {
    expect(maskPhone('+79991234567')).toBe('+799****67');
    expect(maskPhone('123')).toBe('***');
  });
});

describe('normalizePhone', () => {
  it('strips formatting characters', () => {
    expect(normalizePhone('+7 (999) 123-45-67')).toBe('+79991234567');
  });

  it('expands the Russian leading-8 shorthand', () => {
    expect(normalizePhone('8 999 123 45 67')).toBe('+79991234567');
  });

  it('leaves an already-prefixed number alone', () => {
    expect(normalizePhone('+18005551234')).toBe('+18005551234');
  });
});
