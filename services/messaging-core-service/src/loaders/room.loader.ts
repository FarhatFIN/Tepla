import { DataLoader, BaseRepository } from '@tepla/common';

const repo = new (class extends BaseRepository { constructor() { super('chats'); } })();

/**
 * Batches getRoomById calls into a single SELECT WHERE id = ANY($1).
 * Create per-request to avoid stale cache across requests.
 */
export function createRoomLoader(): DataLoader<string, any> {
  return new DataLoader(async (ids: string[]) => {
    const rows = await repo.queryMany(
      `SELECT * FROM chats WHERE id = ANY($1::uuid[])`,
      [ids]
    );
    const map = new Map<string, any>();
    for (const row of rows) {
      map.set(row.id, row);
    }
    return map;
  });
}
