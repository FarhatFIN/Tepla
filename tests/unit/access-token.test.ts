import { describe, expect, it } from 'vitest';
import jwt from 'jsonwebtoken';
import { verifyAccessToken } from '../../shared/security/src/access-token';

const SECRET = 'test-secret-do-not-use-anywhere';

describe('verifyAccessToken (C-04)', () => {
  it('accepts a valid access token', () => {
    const token = jwt.sign({ sub: 'user-1', username: 'alice', jti: 'j1' }, SECRET, { expiresIn: 900 });
    expect(verifyAccessToken(token, SECRET)).toEqual({ userId: 'user-1', jti: 'j1' });
  });

  it('REJECTS a refresh token', () => {
    // This is the whole bug: refresh tokens are signed with the same secret and
    // live for 30 days. The HTTP middleware rejects `type: 'refresh'`; the
    // WebSocket path did not, so a stolen refresh token was a month-long
    // realtime session.
    const refresh = jwt.sign({ sub: 'user-1', type: 'refresh', jti: 'r1' }, SECRET, { expiresIn: '30d' });
    expect(verifyAccessToken(refresh, SECRET)).toBeNull();
  });

  it('rejects a token with no expiry', () => {
    // The old check was `if (decoded.exp && ...)` — a token without `exp`
    // skipped the comparison entirely and was accepted forever.
    const token = jwt.sign({ sub: 'user-1' }, SECRET);
    expect(verifyAccessToken(token, SECRET)).toBeNull();
  });

  it('rejects an expired token', () => {
    const token = jwt.sign({ sub: 'user-1', exp: Math.floor(Date.now() / 1000) - 60 }, SECRET);
    expect(verifyAccessToken(token, SECRET)).toBeNull();
  });

  it('rejects a token signed with a different secret', () => {
    const token = jwt.sign({ sub: 'user-1' }, 'attacker-secret', { expiresIn: 900 });
    expect(verifyAccessToken(token, SECRET)).toBeNull();
  });

  it('rejects an alg:none token', () => {
    const token = jwt.sign({ sub: 'user-1', exp: Math.floor(Date.now() / 1000) + 900 }, '', { algorithm: 'none' });
    expect(verifyAccessToken(token, SECRET)).toBeNull();
  });

  it('rejects a tampered payload', () => {
    const token = jwt.sign({ sub: 'user-1' }, SECRET, { expiresIn: 900 });
    const [header, payload, signature] = token.split('.');
    const forged = Buffer.from(JSON.stringify({
      sub: 'admin', exp: Math.floor(Date.now() / 1000) + 900,
    })).toString('base64url');
    expect(verifyAccessToken(`${header}.${forged}.${signature}`, SECRET)).toBeNull();
    expect(payload).not.toBe(forged);
  });

  it('rejects structurally invalid input without throwing', () => {
    for (const bad of ['', 'not.a.token', 'a.b', '...', 'x'.repeat(500)]) {
      expect(verifyAccessToken(bad, SECRET)).toBeNull();
    }
  });

  it('returns null when no secret is configured, rather than trusting the token', () => {
    const token = jwt.sign({ sub: 'user-1' }, SECRET, { expiresIn: 900 });
    expect(verifyAccessToken(token, undefined)).toBeNull();
    expect(verifyAccessToken(token, '')).toBeNull();
  });

  it('accepts the legacy `userId` claim as well as `sub`', () => {
    const token = jwt.sign({ userId: 'user-9' }, SECRET, { expiresIn: 900 });
    expect(verifyAccessToken(token, SECRET)).toEqual({ userId: 'user-9', jti: undefined });
  });

  it('rejects a token carrying neither sub nor userId', () => {
    const token = jwt.sign({ username: 'alice' }, SECRET, { expiresIn: 900 });
    expect(verifyAccessToken(token, SECRET)).toBeNull();
  });
});
