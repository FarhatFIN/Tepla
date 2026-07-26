import { describe, expect, it, vi } from 'vitest';
import { AppError, ValidationError, errorHandler } from '../../shared/common/src/errors';
import { parseTrustProxy } from '../../shared/common/src/proxy';

function mockRes() {
  const res = {
    statusCode: 0,
    body: undefined as unknown,
    status(code: number) { this.statusCode = code; return this; },
    json(payload: unknown) { this.body = payload; return this; },
  };
  return res;
}

describe('AppError', () => {
  it('derives a code from the status when none is given', () => {
    // Several call sites (the calls module, media routes) always constructed
    // AppError with just a message and status, which produced
    // `code: undefined` in the JSON body — and did not typecheck.
    expect(new AppError('Call not found', 404).code).toBe('NOT_FOUND');
    expect(new AppError('Not a member', 403).code).toBe('FORBIDDEN');
    expect(new AppError('boom', 500).code).toBe('INTERNAL_ERROR');
  });

  it('keeps an explicit code', () => {
    expect(new AppError('nope', 400, 'CUSTOM').code).toBe('CUSTOM');
  });
});

describe('errorHandler', () => {
  it('maps a ValidationError to 400', () => {
    const res = mockRes();
    errorHandler(new ValidationError('bad input'), {} as never, res as never, vi.fn() as never);
    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({ success: false, error: { code: 'VALIDATION_ERROR' } });
  });

  it('maps Postgres 22P02 to 400 instead of leaking a 500 (M-04)', () => {
    // A non-UUID path parameter used to raise this deep inside pg and escape as
    // an opaque "An unexpected error occurred".
    const pgError = Object.assign(new Error('invalid input syntax for type uuid'), { code: '22P02' });
    const res = mockRes();
    errorHandler(pgError, {} as never, res as never, vi.fn() as never);
    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({ error: { code: 'INVALID_INPUT' } });
  });

  it('maps a unique-violation to 409', () => {
    const pgError = Object.assign(new Error('duplicate key'), { code: '23505' });
    const res = mockRes();
    errorHandler(pgError, {} as never, res as never, vi.fn() as never);
    expect(res.statusCode).toBe(409);
  });

  it('does not leak internals for an unknown error', () => {
    const res = mockRes();
    errorHandler(new Error('connection string postgres://user:hunter2@db'), {} as never, res as never, vi.fn() as never);
    expect(res.statusCode).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain('hunter2');
    expect(res.body).toMatchObject({ error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } });
  });

  it('does not treat an unrelated `code` property as a pg error', () => {
    const res = mockRes();
    errorHandler(Object.assign(new Error('dns'), { code: 'ENOTFOUND' }), {} as never, res as never, vi.fn() as never);
    expect(res.statusCode).toBe(500);
  });
});

describe('parseTrustProxy (H-05)', () => {
  it('defaults to one hop — the API gateway — not to blanket trust', () => {
    // `true` would trust the whole forwarded chain, letting any client choose
    // its own apparent IP and therefore its own rate-limit bucket.
    expect(parseTrustProxy(undefined)).toBe(1);
    expect(parseTrustProxy('')).toBe(1);
    expect(parseTrustProxy('   ')).toBe(1);
  });

  it('accepts explicit booleans', () => {
    expect(parseTrustProxy('true')).toBe(true);
    expect(parseTrustProxy('false')).toBe(false);
    expect(parseTrustProxy('0')).toBe(false);
  });

  it('accepts a hop count', () => {
    expect(parseTrustProxy('2')).toBe(2);
    expect(parseTrustProxy(' 3 ')).toBe(3);
  });

  it('passes an address or CIDR list through for Express to parse', () => {
    expect(parseTrustProxy('10.0.0.0/8')).toBe('10.0.0.0/8');
    expect(parseTrustProxy('loopback, 172.16.0.0/12')).toBe('loopback, 172.16.0.0/12');
  });

  it('does not silently accept a negative or fractional hop count', () => {
    expect(parseTrustProxy('-1')).toBe('-1');
    expect(parseTrustProxy('1.5')).toBe('1.5');
  });
});
