import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeRedis } from './fake-redis';

// AuditLogger and SecurityMetrics reach for a Redis handle at call time; stub
// them so the limiter can be exercised in isolation.
vi.mock('../../shared/security/src/audit-logger', () => ({
  AuditLogger: { log: vi.fn(async () => {}), setRedis: vi.fn() },
}));
vi.mock('../../shared/security/src/security-metrics', () => ({
  SecurityMetrics: {
    rateLimit: vi.fn(async () => {}),
    authFailure: vi.fn(async () => {}),
    authSuccess: vi.fn(async () => {}),
    anomalyDetected: vi.fn(async () => {}),
    getAll: vi.fn(async () => ({})),
  },
}));

const { SecurityRateLimiter } = await import('../../shared/security/src/rate-limiter');
const { SecurityConfig } = await import('../../shared/security/src/config');

let redis: FakeRedis;
let limiter: InstanceType<typeof SecurityRateLimiter>;

beforeEach(() => {
  redis = new FakeRedis();
  limiter = new SecurityRateLimiter(redis as never);
});

describe('SecurityRateLimiter.check', () => {
  it('allows up to the limit and then throws', async () => {
    for (let i = 0; i < 3; i++) {
      await expect(limiter.check('k', 3)).resolves.toBeUndefined();
    }
    await expect(limiter.check('k', 3)).rejects.toThrow(/Rate limit exceeded/);
  });

  it('resets once the window elapses', async () => {
    await limiter.check('k', 1);
    await expect(limiter.check('k', 1)).rejects.toThrow();

    redis.advance(SecurityConfig.RATE_LIMIT_WINDOW + 1);
    await expect(limiter.check('k', 1)).resolves.toBeUndefined();
  });

  it('re-applies a TTL that was lost (e.g. after a Redis restart)', async () => {
    await limiter.check('k', 5);
    await redis.del('does-not-matter');
    // Strip the expiry to simulate a key that survived without its TTL.
    (redis as unknown as { expiries: Map<string, number> }).expiries.delete('sec_rate:k');

    await limiter.check('k', 5);
    expect(await redis.ttl('sec_rate:k')).toBeGreaterThan(0);
  });
});

describe('SecurityRateLimiter auth counters (H-01)', () => {
  it('keeps attempt throttling and failure counting in separate keys', async () => {
    // The bug: checkAuth() incremented the SAME key recordAuthFailure() used.
    // Merely *calling* the login endpoint therefore counted as a failed login.
    await limiter.checkAuth('victim@example.com');

    const keys = redis.keys();
    expect(keys).toContain('sec_rate:auth_attempt:victim@example.com');
    expect(keys).not.toContain('sec_rate:auth_fail:victim@example.com');
  });

  it('does not lock an account out from unauthenticated attempts alone', async () => {
    // Previously: MAX_AUTH_FAILURES calls to /login with just the victim's
    // email — no password at all — locked them out of their own account.
    for (let i = 0; i < SecurityConfig.MAX_AUTH_FAILURES; i++) {
      await limiter.checkAuth('victim@example.com');
    }
    expect(await redis.get('sec_lockout:victim@example.com')).toBeNull();
    await expect(limiter.checkAuth('victim@example.com')).resolves.toBeUndefined();
  });

  it('still locks out after the configured number of real failures', async () => {
    for (let i = 0; i < SecurityConfig.MAX_AUTH_FAILURES; i++) {
      await limiter.recordAuthFailure('attacker@example.com');
    }
    expect(await redis.get('sec_lockout:attacker@example.com')).toBe('1');
    await expect(limiter.checkAuth('attacker@example.com')).rejects.toThrow(/Account locked/);
  });

  it('gives the user the full failure budget, not half of it', async () => {
    // With the shared counter, checkAuth + recordAuthFailure each incremented,
    // so a user was locked after roughly MAX_AUTH_FAILURES/2 wrong passwords.
    for (let i = 0; i < SecurityConfig.MAX_AUTH_FAILURES - 1; i++) {
      await limiter.checkAuth('user@example.com');
      await limiter.recordAuthFailure('user@example.com');
    }
    expect(await redis.get('sec_lockout:user@example.com')).toBeNull();
    await expect(limiter.checkAuth('user@example.com')).resolves.toBeUndefined();
  });

  it('reports a positive retry-after while locked', async () => {
    for (let i = 0; i < SecurityConfig.MAX_AUTH_FAILURES; i++) {
      await limiter.recordAuthFailure('x@example.com');
    }
    await expect(limiter.checkAuth('x@example.com')).rejects.toThrow(/Retry in \d+ seconds/);
  });

  it('clears every auth key on a successful login', async () => {
    await limiter.checkAuth('user@example.com');
    await limiter.recordAuthFailure('user@example.com');
    await limiter.clearAuthFailures('user@example.com');

    expect(redis.keys().filter((k) => k.includes('user@example.com'))).toEqual([]);
  });

  it('unlocks once the lockout expires', async () => {
    for (let i = 0; i < SecurityConfig.MAX_AUTH_FAILURES; i++) {
      await limiter.recordAuthFailure('y@example.com');
    }
    await expect(limiter.checkAuth('y@example.com')).rejects.toThrow();

    redis.advance(SecurityConfig.AUTH_LOCKOUT_SECONDS + 1);
    await expect(limiter.checkAuth('y@example.com')).resolves.toBeUndefined();
  });
});

describe('SecurityRateLimiter.recordFactorAttempt (C-06/C-07)', () => {
  it('allows exactly `max` attempts', async () => {
    for (let i = 1; i <= 5; i++) {
      const result = await limiter.recordFactorAttempt('2fa:abc', 5, 300);
      expect(result).toEqual({ allowed: true, attempts: i });
    }
    expect(await limiter.recordFactorAttempt('2fa:abc', 5, 300))
      .toEqual({ allowed: false, attempts: 6 });
  });

  it('scopes attempts per key, so one challenge cannot exhaust another', async () => {
    for (let i = 0; i < 5; i++) await limiter.recordFactorAttempt('2fa:one', 5, 300);
    expect((await limiter.recordFactorAttempt('2fa:two', 5, 300)).allowed).toBe(true);
  });

  it('expires the counter after its window', async () => {
    for (let i = 0; i < 5; i++) await limiter.recordFactorAttempt('pin:u', 5, 300);
    expect((await limiter.recordFactorAttempt('pin:u', 5, 300)).allowed).toBe(false);

    redis.advance(301);
    expect((await limiter.recordFactorAttempt('pin:u', 5, 300)).allowed).toBe(true);
  });

  it('clears on success', async () => {
    await limiter.recordFactorAttempt('pin:u', 5, 300);
    await limiter.clearFactorAttempts('pin:u');
    expect((await limiter.recordFactorAttempt('pin:u', 5, 300)).attempts).toBe(1);
  });
});
