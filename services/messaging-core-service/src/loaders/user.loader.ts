import { DataLoader, BaseRepository } from '@tepla/common';

const repo = new (class extends BaseRepository { constructor() { super('users'); } })();

/**
 * Batches getUserById calls into a single SELECT WHERE id = ANY($1).
 * Create per-request to avoid stale cache across requests.
 */
export function createUserLoader(): DataLoader<string, any> {
  return new DataLoader(async (ids: string[]) => {
    const rows = await repo.queryMany(
      `SELECT id, username, display_name, avatar_url, bio, is_online, last_seen
       FROM users WHERE id = ANY($1::uuid[])`,
      [ids]
    );
    const map = new Map<string, any>();
    for (const row of rows) {
      map.set(row.id, row);
    }
    return map;
  });
}
