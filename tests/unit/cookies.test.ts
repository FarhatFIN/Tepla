import { describe, expect, it, vi } from 'vitest';
import { parseCookieHeader, cookieMiddleware } from '../../shared/common/src/cookies';

describe('parseCookieHeader (H-04)', () => {
  it('parses the header the services were silently ignoring', () => {
    // `req.cookies` was read in the refresh flow and in device fingerprinting,
    // but cookie-parser was never registered — so every one of those reads was
    // undefined and the cookie-based paths simply never worked.
    expect(parseCookieHeader('accessToken=abc; refreshToken=def')).toEqual({
      accessToken: 'abc',
      refreshToken: 'def',
    });
  });

  it('returns an empty object for a missing or empty header', () => {
    expect(parseCookieHeader(undefined)).toEqual({});
    expect(parseCookieHeader('')).toEqual({});
  });

  it('URI-decodes values, as the old inline parser did', () => {
    expect(parseCookieHeader('deviceId=a%20b%2Fc')).toEqual({ deviceId: 'a b/c' });
  });

  it('keeps a malformed percent-escape verbatim instead of throwing', () => {
    // decodeURIComponent('%zz') throws; a bad cookie must not 500 the request.
    expect(parseCookieHeader('token=%zz')).toEqual({ token: '%zz' });
  });

  it('strips surrounding double quotes', () => {
    expect(parseCookieHeader('name="quoted value"')).toEqual({ name: 'quoted value' });
  });

  it('tolerates whitespace and empty segments', () => {
    expect(parseCookieHeader('  a=1 ;; b=2  ;')).toEqual({ a: '1', b: '2' });
  });

  it('keeps "=" inside the value', () => {
    // JWTs and base64 payloads routinely contain '='.
    expect(parseCookieHeader('jwt=aa.bb==')).toEqual({ jwt: 'aa.bb==' });
  });

  it('ignores segments with no name', () => {
    expect(parseCookieHeader('=novalue; ok=1')).toEqual({ ok: '1' });
  });

  it('lets the first occurrence win, matching cookie-parser', () => {
    expect(parseCookieHeader('a=first; a=second')).toEqual({ a: 'first' });
  });
});

describe('cookieMiddleware', () => {
  it('populates req.cookies and calls next', () => {
    const req = { headers: { cookie: 'accessToken=xyz' } } as never as {
      headers: { cookie: string };
      cookies?: Record<string, string>;
    };
    const next = vi.fn();

    cookieMiddleware()(req as never, {} as never, next as never);

    expect(req.cookies).toEqual({ accessToken: 'xyz' });
    expect(next).toHaveBeenCalledOnce();
  });

  it('does not clobber cookies another parser already set', () => {
    const req = {
      headers: { cookie: 'a=fromheader' },
      cookies: { a: 'preset' },
    } as never as { cookies: Record<string, string> };

    cookieMiddleware()(req as never, {} as never, vi.fn() as never);

    expect(req.cookies).toEqual({ a: 'preset' });
  });
});
