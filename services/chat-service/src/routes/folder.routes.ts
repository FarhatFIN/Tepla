import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuid } from 'uuid';
import { RedisClient, KafkaProducer, authMiddleware, NotFoundError, ValidationError, ForbiddenError, createLogger, BaseRepository } from '@tepla/common';
import { FolderId, UserId, ChatType } from '@tepla/types';

const logger = createLogger('folder-routes');

class FolderRepository extends BaseRepository {
  async create(data: any): Promise<any> {
    return this.queryOne(
      `INSERT INTO chat_folders (id, user_id, name, icon, position, filter_include_types, filter_exclude_muted,
        filter_exclude_read, filter_include_unread, pinned_chat_ids, included_chat_ids, excluded_chat_ids, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW()) RETURNING *`,
      [data.id, data.userId, data.name, data.icon, data.position,
       JSON.stringify(data.filterIncludeTypes || []), data.filterExcludeMuted || false,
       data.filterExcludeRead || false, data.filterIncludeUnread || false,
       JSON.stringify(data.pinnedChatIds || []), JSON.stringify(data.includedChatIds || []),
       JSON.stringify(data.excludedChatIds || [])]
    );
  }

  async findByUser(userId: string): Promise<any[]> {
    return this.queryMany(
      `SELECT * FROM chat_folders WHERE user_id = $1 ORDER BY position ASC`, [userId]
    );
  }

  async findById(id: string): Promise<any> {
    return this.queryOne(`SELECT * FROM chat_folders WHERE id = $1`, [id]);
  }

  async update(id: string, fields: any): Promise<any> {
    const sets: string[] = [];
    const vals: any[] = [];
    let i = 1;
    if (fields.name !== undefined) { sets.push(`name = $${i++}`); vals.push(fields.name); }
    if (fields.icon !== undefined) { sets.push(`icon = $${i++}`); vals.push(fields.icon); }
    if (fields.position !== undefined) { sets.push(`position = $${i++}`); vals.push(fields.position); }
    if (fields.filterIncludeTypes !== undefined) { sets.push(`filter_include_types = $${i++}`); vals.push(JSON.stringify(fields.filterIncludeTypes)); }
    if (fields.filterExcludeMuted !== undefined) { sets.push(`filter_exclude_muted = $${i++}`); vals.push(fields.filterExcludeMuted); }
    if (fields.filterExcludeRead !== undefined) { sets.push(`filter_exclude_read = $${i++}`); vals.push(fields.filterExcludeRead); }
    if (fields.filterIncludeUnread !== undefined) { sets.push(`filter_include_unread = $${i++}`); vals.push(fields.filterIncludeUnread); }
    if (fields.pinnedChatIds !== undefined) { sets.push(`pinned_chat_ids = $${i++}`); vals.push(JSON.stringify(fields.pinnedChatIds)); }
    if (fields.includedChatIds !== undefined) { sets.push(`included_chat_ids = $${i++}`); vals.push(JSON.stringify(fields.includedChatIds)); }
    if (fields.excludedChatIds !== undefined) { sets.push(`excluded_chat_ids = $${i++}`); vals.push(JSON.stringify(fields.excludedChatIds)); }
    if (sets.length === 0) return this.findById(id);
    vals.push(id);
    return this.queryOne(`UPDATE chat_folders SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`, vals);
  }

  async delete(id: string): Promise<void> {
    await this.execute(`DELETE FROM chat_folders WHERE id = $1`, [id]);
  }

  async reorder(userId: string, folderIds: string[]): Promise<void> {
    for (let i = 0; i < folderIds.length; i++) {
      await this.execute(
        `UPDATE chat_folders SET position = $1 WHERE id = $2 AND user_id = $3`,
        [i, folderIds[i], userId]
      );
    }
  }
}

export function folderRouter(redis: RedisClient, kafka: KafkaProducer): Router {
  const router = Router();
  const auth = authMiddleware();
  const repo = new FolderRepository();

  // GET /api/folders — get user's folders
  router.get('/', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const folders = await repo.findByUser(req.user!.sub);
      res.json({ success: true, data: folders });
    } catch (err) { next(err); }
  });

  // POST /api/folders — create folder
  router.post('/', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const existing = await repo.findByUser(req.user!.sub);
      const maxFolders = req.user!.isPremium ? 20 : 5;
      if (existing.length >= maxFolders) throw new ValidationError(`Max ${maxFolders} folders`);

      const folder = await repo.create({
        id: uuid(),
        userId: req.user!.sub,
        position: existing.length,
        ...req.body,
      });
      res.status(201).json({ success: true, data: folder });
    } catch (err) { next(err); }
  });

  // PATCH /api/folders/:id — update folder
  router.patch('/:id', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const folder = await repo.findById(req.params.id);
      if (!folder || folder.user_id !== req.user!.sub) throw new NotFoundError('Folder');
      const updated = await repo.update(folder.id, req.body);
      res.json({ success: true, data: updated });
    } catch (err) { next(err); }
  });

  // DELETE /api/folders/:id
  router.delete('/:id', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const folder = await repo.findById(req.params.id);
      if (!folder || folder.user_id !== req.user!.sub) throw new NotFoundError('Folder');
      await repo.delete(folder.id);
      res.json({ success: true });
    } catch (err) { next(err); }
  });

  // PUT /api/folders/reorder — reorder folders
  router.put('/reorder', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { folderIds } = req.body;
      if (!folderIds?.length) throw new ValidationError('folderIds required');
      await repo.reorder(req.user!.sub, folderIds);
      res.json({ success: true });
    } catch (err) { next(err); }
  });

  return router;
}
