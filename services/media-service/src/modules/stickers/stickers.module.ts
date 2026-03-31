import { Router } from 'express';
import crypto from 'crypto';
import {
  BaseRepository,
  RedisClient,
  authMiddleware,
  AppError,
} from '@tepla/common';
import {
  StickerPackId,
  StickerId,
  StickerPack,
  Sticker,
  StickerType,
  UserId,
} from '@tepla/types';

// ─── Repository ────────────────────────────
export class StickerRepository extends BaseRepository {
  async createPack(pack: StickerPack): Promise<StickerPack> {
    await this.execute(
      `INSERT INTO sticker_packs (id, name, title, creator_id, type, thumbnail_url, is_official, is_premium, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())`,
      [pack.id, pack.name, pack.title, pack.creatorId, pack.type, pack.thumbnailUrl, pack.isOfficial, pack.isPremium]
    );
    return pack;
  }

  async addSticker(sticker: Sticker): Promise<void> {
    await this.execute(
      `INSERT INTO stickers (id, pack_id, emoji, file_url, thumbnail_url, width, height, is_animated, position)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [sticker.id, sticker.packId, sticker.emoji, sticker.fileUrl, sticker.thumbnailUrl,
       sticker.width, sticker.height, sticker.isAnimated, sticker.position]
    );
  }

  async getPack(id: StickerPackId): Promise<StickerPack | null> {
    const row = await this.queryOne<any>(`SELECT * FROM sticker_packs WHERE id = $1`, [id]);
    if (!row) return null;
    const stickers = await this.queryMany<any>(
      `SELECT * FROM stickers WHERE pack_id = $1 ORDER BY position`, [id]
    );
    return this.mapPack(row, stickers);
  }

  async getPackByName(name: string): Promise<StickerPack | null> {
    const row = await this.queryOne<any>(`SELECT * FROM sticker_packs WHERE name = $1`, [name]);
    if (!row) return null;
    const stickers = await this.queryMany<any>(
      `SELECT * FROM stickers WHERE pack_id = $1 ORDER BY position`, [row.id]
    );
    return this.mapPack(row, stickers);
  }

  async searchPacks(query: string, limit = 20): Promise<StickerPack[]> {
    const rows = await this.queryMany<any>(
      `SELECT sp.*, COUNT(si.user_id) as install_count_real
       FROM sticker_packs sp
       LEFT JOIN sticker_installs si ON si.pack_id = sp.id
       WHERE sp.title ILIKE $1 OR sp.name ILIKE $1
       GROUP BY sp.id
       ORDER BY install_count_real DESC
       LIMIT $2`,
      [`%${query}%`, limit]
    );
    const packs: StickerPack[] = [];
    for (const row of rows) {
      const stickers = await this.queryMany<any>(
        `SELECT * FROM stickers WHERE pack_id = $1 ORDER BY position LIMIT 5`, [row.id]
      );
      packs.push(this.mapPack(row, stickers));
    }
    return packs;
  }

  async getTrending(limit = 20): Promise<StickerPack[]> {
    const rows = await this.queryMany<any>(
      `SELECT sp.*, COUNT(si.user_id) as real_installs
       FROM sticker_packs sp
       LEFT JOIN sticker_installs si ON si.pack_id = sp.id
       GROUP BY sp.id
       ORDER BY real_installs DESC
       LIMIT $1`,
      [limit]
    );
    const packs: StickerPack[] = [];
    for (const row of rows) {
      const stickers = await this.queryMany<any>(
        `SELECT * FROM stickers WHERE pack_id = $1 ORDER BY position LIMIT 5`, [row.id]
      );
      packs.push(this.mapPack(row, stickers));
    }
    return packs;
  }

  async installPack(userId: UserId, packId: StickerPackId): Promise<void> {
    await this.execute(
      `INSERT INTO sticker_installs (user_id, pack_id, installed_at) VALUES ($1,$2,NOW())
       ON CONFLICT DO NOTHING`,
      [userId, packId]
    );
    await this.execute(`UPDATE sticker_packs SET install_count = install_count + 1 WHERE id = $1`, [packId]);
  }

  async uninstallPack(userId: UserId, packId: StickerPackId): Promise<void> {
    await this.execute(`DELETE FROM sticker_installs WHERE user_id = $1 AND pack_id = $2`, [userId, packId]);
    await this.execute(`UPDATE sticker_packs SET install_count = GREATEST(install_count - 1, 0) WHERE id = $1`, [packId]);
  }

  async getUserPacks(userId: UserId): Promise<StickerPack[]> {
    const rows = await this.queryMany<any>(
      `SELECT sp.* FROM sticker_packs sp
       JOIN sticker_installs si ON si.pack_id = sp.id
       WHERE si.user_id = $1
       ORDER BY si.installed_at DESC`,
      [userId]
    );
    const packs: StickerPack[] = [];
    for (const row of rows) {
      const stickers = await this.queryMany<any>(
        `SELECT * FROM stickers WHERE pack_id = $1 ORDER BY position`, [row.id]
      );
      packs.push(this.mapPack(row, stickers));
    }
    return packs;
  }

  async getRecentStickers(userId: UserId, limit = 30): Promise<Sticker[]> {
    const rows = await this.queryMany<any>(
      `SELECT s.* FROM stickers s
       JOIN sticker_usage su ON su.sticker_id = s.id
       WHERE su.user_id = $1
       ORDER BY su.used_at DESC
       LIMIT $2`,
      [userId, limit]
    );
    return rows.map(r => this.mapSticker(r));
  }

  async recordUsage(userId: UserId, stickerId: StickerId): Promise<void> {
    await this.execute(
      `INSERT INTO sticker_usage (user_id, sticker_id, used_at) VALUES ($1,$2,NOW())
       ON CONFLICT (user_id, sticker_id) DO UPDATE SET used_at = NOW()`,
      [userId, stickerId]
    );
  }

  async findStickerByEmoji(emoji: string, limit = 20): Promise<Sticker[]> {
    const rows = await this.queryMany<any>(
      `SELECT s.* FROM stickers s
       JOIN sticker_packs sp ON sp.id = s.pack_id
       WHERE s.emoji = $1
       ORDER BY sp.install_count DESC
       LIMIT $2`,
      [emoji, limit]
    );
    return rows.map(r => this.mapSticker(r));
  }

  async deletePack(id: StickerPackId): Promise<void> {
    await this.execute(`DELETE FROM stickers WHERE pack_id = $1`, [id]);
    await this.execute(`DELETE FROM sticker_installs WHERE pack_id = $1`, [id]);
    await this.execute(`DELETE FROM sticker_packs WHERE id = $1`, [id]);
  }

  private mapPack(row: any, stickerRows: any[]): StickerPack {
    return {
      id: row.id as StickerPackId,
      name: row.name,
      title: row.title,
      creatorId: row.creator_id as UserId,
      type: row.type as StickerType,
      thumbnailUrl: row.thumbnail_url,
      stickers: stickerRows.map(s => this.mapSticker(s)),
      isOfficial: row.is_official,
      isPremium: row.is_premium,
      installCount: row.install_count || 0,
      createdAt: row.created_at,
    };
  }

  private mapSticker(row: any): Sticker {
    return {
      id: row.id as StickerId,
      packId: row.pack_id as StickerPackId,
      emoji: row.emoji,
      fileUrl: row.file_url,
      thumbnailUrl: row.thumbnail_url,
      width: row.width,
      height: row.height,
      isAnimated: row.is_animated,
      position: row.position,
    };
  }
}

// ─── Router ───────────────────────────────
export function stickerRouter(redis: RedisClient): Router {
  const router = Router();
  const repo = new StickerRepository();

  // ── Create sticker pack ──
  router.post('/packs', authMiddleware(), async (req, res, next) => {
    try {
      const { name, title, type, thumbnailUrl, stickers } = req.body;
      const packId = crypto.randomUUID() as StickerPackId;
      const pack = await repo.createPack({
        id: packId,
        name,
        title,
        creatorId: req.user!.sub,
        type: type || StickerType.STATIC,
        thumbnailUrl: thumbnailUrl || null,
        stickers: [],
        isOfficial: false,
        isPremium: false,
        installCount: 0,
        createdAt: new Date().toISOString(),
      });

      if (stickers?.length) {
        for (let i = 0; i < stickers.length; i++) {
          const s = stickers[i];
          await repo.addSticker({
            id: crypto.randomUUID() as StickerId,
            packId,
            emoji: s.emoji,
            fileUrl: s.fileUrl,
            thumbnailUrl: s.thumbnailUrl || null,
            width: s.width || 512,
            height: s.height || 512,
            isAnimated: type === StickerType.ANIMATED || type === StickerType.VIDEO,
            position: i,
          });
        }
      }

      const fullPack = await repo.getPack(packId);
      res.status(201).json({ success: true, data: fullPack });
    } catch (err) { next(err); }
  });

  // ── Get pack ──
  router.get('/packs/:packId', async (req, res, next) => {
    try {
      const pack = await repo.getPack(req.params.packId as StickerPackId)
        || await repo.getPackByName(req.params.packId);
      if (!pack) throw new AppError('Pack not found', 404);
      res.json({ success: true, data: pack });
    } catch (err) { next(err); }
  });

  // ── Search packs ──
  router.get('/search', async (req, res, next) => {
    try {
      const q = req.query.q as string || '';
      const packs = await repo.searchPacks(q);
      res.json({ success: true, data: packs });
    } catch (err) { next(err); }
  });

  // ── Trending packs ──
  router.get('/trending', async (req, res, next) => {
    try {
      const cached = await redis.get('stickers:trending');
      if (cached) return res.json({ success: true, data: JSON.parse(cached) });
      const packs = await repo.getTrending();
      await redis.setex('stickers:trending', 300, JSON.stringify(packs));
      res.json({ success: true, data: packs });
    } catch (err) { next(err); }
  });

  // ── Install pack ──
  router.post('/packs/:packId/install', authMiddleware(), async (req, res, next) => {
    try {
      await repo.installPack(req.user!.sub, req.params.packId as StickerPackId);
      res.json({ success: true });
    } catch (err) { next(err); }
  });

  // ── Uninstall pack ──
  router.delete('/packs/:packId/install', authMiddleware(), async (req, res, next) => {
    try {
      await repo.uninstallPack(req.user!.sub, req.params.packId as StickerPackId);
      res.json({ success: true });
    } catch (err) { next(err); }
  });

  // ── My installed packs ──
  router.get('/my', authMiddleware(), async (req, res, next) => {
    try {
      const packs = await repo.getUserPacks(req.user!.sub);
      res.json({ success: true, data: packs });
    } catch (err) { next(err); }
  });

  // ── Recent stickers ──
  router.get('/recent', authMiddleware(), async (req, res, next) => {
    try {
      const stickers = await repo.getRecentStickers(req.user!.sub);
      res.json({ success: true, data: stickers });
    } catch (err) { next(err); }
  });

  // ── Record sticker usage ──
  router.post('/:stickerId/use', authMiddleware(), async (req, res, next) => {
    try {
      await repo.recordUsage(req.user!.sub, req.params.stickerId as StickerId);
      res.json({ success: true });
    } catch (err) { next(err); }
  });

  // ── Find by emoji ──
  router.get('/emoji/:emoji', async (req, res, next) => {
    try {
      const stickers = await repo.findStickerByEmoji(decodeURIComponent(req.params.emoji));
      res.json({ success: true, data: stickers });
    } catch (err) { next(err); }
  });

  // ── Delete pack (owner only) ──
  router.delete('/packs/:packId', authMiddleware(), async (req, res, next) => {
    try {
      const pack = await repo.getPack(req.params.packId as StickerPackId);
      if (!pack || pack.creatorId !== req.user!.sub) throw new AppError('Not found', 404);
      await repo.deletePack(pack.id);
      res.json({ success: true });
    } catch (err) { next(err); }
  });

  return router;
}
