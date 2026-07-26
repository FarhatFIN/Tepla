/**
 * A tiny in-memory stand-in for the subset of ioredis the security modules use.
 *
 * Enough to exercise counter/lockout logic without a Redis server. TTLs are
 * tracked as absolute deadlines against an injectable clock so tests can move
 * time forward without sleeping.
 */
export class FakeRedis {
  private store = new Map<string, string>();
  private expiries = new Map<string, number>();
  public now = 0;

  private sweep(): void {
    for (const [key, deadline] of this.expiries) {
      if (deadline <= this.now) {
        this.store.delete(key);
        this.expiries.delete(key);
      }
    }
  }

  advance(seconds: number): void {
    this.now += seconds;
    this.sweep();
  }

  async get(key: string): Promise<string | null> {
    this.sweep();
    return this.store.get(key) ?? null;
  }

  async set(key: string, value: string, mode?: string, ttl?: number, nx?: string): Promise<'OK' | null> {
    this.sweep();
    if (nx === 'NX' && this.store.has(key)) return null;
    this.store.set(key, value);
    if (mode === 'EX' && typeof ttl === 'number') this.expiries.set(key, this.now + ttl);
    return 'OK';
  }

  async incr(key: string): Promise<number> {
    this.sweep();
    const next = Number(this.store.get(key) ?? '0') + 1;
    this.store.set(key, String(next));
    return next;
  }

  async expire(key: string, seconds: number): Promise<number> {
    if (!this.store.has(key)) return 0;
    this.expiries.set(key, this.now + seconds);
    return 1;
  }

  async ttl(key: string): Promise<number> {
    this.sweep();
    if (!this.store.has(key)) return -2;
    const deadline = this.expiries.get(key);
    if (deadline === undefined) return -1;
    return Math.max(0, deadline - this.now);
  }

  async del(...keys: string[]): Promise<number> {
    let removed = 0;
    for (const key of keys) {
      if (this.store.delete(key)) removed += 1;
      this.expiries.delete(key);
    }
    return removed;
  }

  /** Keys currently present — used to assert which counters a call touched. */
  keys(): string[] {
    this.sweep();
    return [...this.store.keys()].sort();
  }
}
