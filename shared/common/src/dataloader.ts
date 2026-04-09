/**
 * DataLoader — batches multiple individual DB lookups into single queries.
 *
 * Instead of:
 *   getUserById(id1) → 1 query
 *   getUserById(id2) → 1 query
 * Use:
 *   userLoader.load(id1), userLoader.load(id2) → 1 batched query
 *
 * Auto-deduplicates keys within a tick.
 * Cache is per-request (not global) — create a new loader per request.
 */

export type BatchFn<K, V> = (keys: K[]) => Promise<Map<K, V>>;

export class DataLoader<K, V> {
  private batch: Map<K, { resolve: (v: V | null) => void; reject: (e: Error) => void }[]> = new Map();
  private cache: Map<K, V> = new Map();
  private scheduled = false;

  constructor(
    private batchFn: BatchFn<K, V>,
    private opts: { maxBatchSize?: number; cache?: boolean } = {}
  ) {
    this.opts.cache = opts.cache !== false; // default on
    this.opts.maxBatchSize = opts.maxBatchSize || 100;
  }

  async load(key: K): Promise<V | null> {
    // Check cache
    if (this.opts.cache && this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    return new Promise<V | null>((resolve, reject) => {
      if (!this.batch.has(key)) {
        this.batch.set(key, []);
      }
      this.batch.get(key)!.push({ resolve, reject });

      if (!this.scheduled) {
        this.scheduled = true;
        // Batch within same microtask tick
        queueMicrotask(() => this.dispatch());
      }
    });
  }

  async loadMany(keys: K[]): Promise<(V | null)[]> {
    return Promise.all(keys.map(k => this.load(k)));
  }

  prime(key: K, value: V): void {
    if (this.opts.cache) {
      this.cache.set(key, value);
    }
  }

  clear(key: K): void {
    this.cache.delete(key);
  }

  clearAll(): void {
    this.cache.clear();
  }

  private async dispatch(): Promise<void> {
    this.scheduled = false;
    const currentBatch = this.batch;
    this.batch = new Map();

    const keys = Array.from(currentBatch.keys());
    if (keys.length === 0) return;

    try {
      const results = await this.batchFn(keys);

      for (const [key, callbacks] of currentBatch) {
        const value = results.get(key) || null;
        if (value !== null && this.opts.cache) {
          this.cache.set(key, value);
        }
        for (const cb of callbacks) {
          cb.resolve(value);
        }
      }
    } catch (err) {
      for (const callbacks of currentBatch.values()) {
        for (const cb of callbacks) {
          cb.reject(err as Error);
        }
      }
    }
  }
}
