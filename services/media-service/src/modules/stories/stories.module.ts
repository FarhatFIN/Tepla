// ============================================
// Tepla Messenger — Stories Module
// 24h disappearing stories, video circles
// ============================================

import { Router } from 'express';
import crypto from 'crypto';
import {
  BaseRepository,
  KafkaProducer,
  RedisClient,
  createLogger,
  authMiddleware,
  errorHandler,
  AppError,
} from '@tepla/common';
import {
  StoryId,
  Story,
  StoryType,
  StoryPrivacy,
  StoryView,
  UserId,
  EventTopic,
  EventType,
} from '@tepla/types';

const logger = createLogger('stories-module');
const STORY_TTL_HOURS = 24;
const MAX_STORIES = 50;

// ─── Repository ────────────────────────────
export class StoryRepository extends BaseRepository {
  async create(story: Story): Promise<Story> {
    await this.execute(
      `INSERT INTO stories (id, user_id, type, media_url, thumbnail_url, caption, duration,
        background_color, text_style, privacy, expires_at, is_pinned, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW())`,
      [story.id, story.userId, story.type, story.mediaUrl, story.thumbnailUrl,
       story.caption, story.duration, story.backgroundColor, story.textStyle,
       story.privacy, story.expiresAt, story.isPinned]
    );
    return story;
  }

  async getById(id: StoryId): Promise<Story | null> {
    const row = await this.queryOne<any>(`SELECT * FROM stories WHERE id = $1`, [id]);
    return row ? this.mapStory(row) : null;
  }

  async getUserStories(userId: UserId, viewerId?: UserId): Promise<Story[]> {
    const rows = await this.queryMany<any>(
      `SELECT * FROM stories
       WHERE user_id = $1 AND expires_at > NOW() AND (is_pinned = true OR created_at > NOW() - INTERVAL '24 hours')
       ORDER BY is_pinned DESC, created_at DESC`,
      [userId]
    );
    return rows.map(r => this.mapStory(r));
  }

  async getFeedStories(userId: UserId): Promise<{ userId: UserId; stories: Story[]; hasUnseen: boolean }[]> {
    // Get stories from contacts/followed users
    const rows = await this.queryMany<any>(
      `SELECT s.*,
        CASE WHEN sv.user_id IS NOT NULL THEN true ELSE false END as is_viewed
       FROM stories s
       JOIN chat_members cm ON cm.user_id = s.user_id
       JOIN chat_members cm2 ON cm2.chat_id = cm.chat_id AND cm2.user_id = $1
       LEFT JOIN story_views sv ON sv.story_id = s.id AND sv.user_id = $1
       WHERE s.expires_at > NOW() AND s.user_id != $1
       ORDER BY s.user_id, s.created_at DESC`,
      [userId]
    );

    const grouped = new Map<string, { stories: Story[]; hasUnseen: boolean }>();
    for (const row of rows) {
      const uid = row.user_id as UserId;
      if (!grouped.has(uid)) grouped.set(uid, { stories: [], hasUnseen: false });
      const g = grouped.get(uid)!;
      g.stories.push(this.mapStory(row));
      if (!row.is_viewed) g.hasUnseen = true;
    }

    return Array.from(grouped.entries()).map(([userId, data]) => ({
      userId: userId as UserId,
      ...data,
    }));
  }

  async addView(storyId: StoryId, userId: UserId, reaction?: string): Promise<void> {
    await this.execute(
      `INSERT INTO story_views (story_id, user_id, reaction, viewed_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (story_id, user_id) DO UPDATE SET reaction = COALESCE($3, story_views.reaction)`,
      [storyId, userId, reaction || null]
    );
    await this.execute(`UPDATE stories SET views_count = views_count + 1 WHERE id = $1`, [storyId]);
    if (reaction) {
      await this.execute(`UPDATE stories SET reactions_count = reactions_count + 1 WHERE id = $1`, [storyId]);
    }
  }

  async getViews(storyId: StoryId, limit = 100): Promise<StoryView[]> {
    const rows = await this.queryMany<any>(
      `SELECT * FROM story_views WHERE story_id = $1 ORDER BY viewed_at DESC LIMIT $2`,
      [storyId, limit]
    );
    return rows.map(r => ({
      storyId: r.story_id as StoryId,
      userId: r.user_id as UserId,
      reaction: r.reaction,
      viewedAt: r.viewed_at,
    }));
  }

  async delete(id: StoryId): Promise<void> {
    await this.execute(`DELETE FROM stories WHERE id = $1`, [id]);
  }

  async togglePin(id: StoryId, pinned: boolean): Promise<void> {
    await this.execute(`UPDATE stories SET is_pinned = $1 WHERE id = $2`, [pinned, id]);
  }

  async deleteExpired(): Promise<number> {
    const result = await this.execute(
      `DELETE FROM stories WHERE expires_at < NOW() AND is_pinned = false`
    );
    return (result as any).rowCount || 0;
  }

  async getUserStoryCount(userId: UserId): Promise<number> {
    const row = await this.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM stories WHERE user_id = $1 AND expires_at > NOW()`,
      [userId]
    );
    return parseInt(row?.count || '0', 10);
  }

  mapStory(row: any): Story {
    return {
      id: row.id as StoryId,
      userId: row.user_id as UserId,
      type: row.type as StoryType,
      mediaUrl: row.media_url,
      thumbnailUrl: row.thumbnail_url,
      caption: row.caption,
      duration: row.duration,
      backgroundColor: row.background_color,
      textStyle: row.text_style,
      viewsCount: row.views_count || 0,
      reactionsCount: row.reactions_count || 0,
      isPinned: row.is_pinned,
      privacy: row.privacy as StoryPrivacy,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
    };
  }
}

// ─── Router ───────────────────────────────
export function storiesRouter(redis: RedisClient, kafka: KafkaProducer): Router {
  const router = Router();
  const repo = new StoryRepository();

  // ── Create story ──
  router.post('/', authMiddleware(), async (req, res, next) => {
    try {
      const userId = req.user!.sub;
      const { type, mediaUrl, thumbnailUrl, caption, duration, backgroundColor, textStyle, privacy } = req.body;

      const count = await repo.getUserStoryCount(userId);
      if (count >= MAX_STORIES) throw new AppError(`Max ${MAX_STORIES} active stories`, 429);

      const storyId = crypto.randomUUID() as StoryId;
      const expiresAt = new Date(Date.now() + STORY_TTL_HOURS * 60 * 60 * 1000).toISOString();

      const story = await repo.create({
        id: storyId,
        userId,
        type: type || StoryType.IMAGE,
        mediaUrl,
        thumbnailUrl: thumbnailUrl || null,
        caption: caption || null,
        duration: duration || 5,
        backgroundColor: backgroundColor || null,
        textStyle: textStyle || null,
        viewsCount: 0,
        reactionsCount: 0,
        isPinned: false,
        privacy: privacy || StoryPrivacy.EVERYONE,
        expiresAt,
        createdAt: new Date().toISOString(),
      });

      await kafka.send(EventTopic.STORY_EVENTS, {
        id: crypto.randomUUID(),
        type: EventType.STORY_CREATED,
        topic: EventTopic.STORY_EVENTS,
        timestamp: new Date().toISOString(),
        source: 'stories-service',
        correlationId: crypto.randomUUID(),
        userId,
        payload: { storyId: story.id },
      });

      res.status(201).json({ success: true, data: story });
    } catch (err) { next(err); }
  });

  // ── Get story feed ──
  router.get('/feed', authMiddleware(), async (req, res, next) => {
    try {
      const feed = await repo.getFeedStories(req.user!.sub);
      res.json({ success: true, data: feed });
    } catch (err) { next(err); }
  });

  // ── Get my stories ──
  router.get('/my', authMiddleware(), async (req, res, next) => {
    try {
      const stories = await repo.getUserStories(req.user!.sub);
      res.json({ success: true, data: stories });
    } catch (err) { next(err); }
  });

  // ── Get user's stories ──
  router.get('/user/:userId', authMiddleware(), async (req, res, next) => {
    try {
      const stories = await repo.getUserStories(req.params.userId as UserId, req.user!.sub);
      res.json({ success: true, data: stories });
    } catch (err) { next(err); }
  });

  // ── View story ──
  router.post('/:storyId/view', authMiddleware(), async (req, res, next) => {
    try {
      const storyId = req.params.storyId as StoryId;
      const { reaction } = req.body;
      await repo.addView(storyId, req.user!.sub, reaction);

      await kafka.send(EventTopic.STORY_EVENTS, {
        id: crypto.randomUUID(),
        type: reaction ? EventType.STORY_REACTED : EventType.STORY_VIEWED,
        topic: EventTopic.STORY_EVENTS,
        timestamp: new Date().toISOString(),
        source: 'stories-service',
        correlationId: crypto.randomUUID(),
        userId: req.user!.sub,
        payload: { storyId, reaction },
      });

      res.json({ success: true });
    } catch (err) { next(err); }
  });

  // ── Get story views (owner only) ──
  router.get('/:storyId/views', authMiddleware(), async (req, res, next) => {
    try {
      const story = await repo.getById(req.params.storyId as StoryId);
      if (!story || story.userId !== req.user!.sub) throw new AppError('Not found', 404);
      const views = await repo.getViews(story.id);
      res.json({ success: true, data: views });
    } catch (err) { next(err); }
  });

  // ── Pin/unpin story ──
  router.post('/:storyId/pin', authMiddleware(), async (req, res, next) => {
    try {
      const story = await repo.getById(req.params.storyId as StoryId);
      if (!story || story.userId !== req.user!.sub) throw new AppError('Not found', 404);
      await repo.togglePin(story.id, !story.isPinned);
      res.json({ success: true, data: { isPinned: !story.isPinned } });
    } catch (err) { next(err); }
  });

  // ── Delete story ──
  router.delete('/:storyId', authMiddleware(), async (req, res, next) => {
    try {
      const story = await repo.getById(req.params.storyId as StoryId);
      if (!story || story.userId !== req.user!.sub) throw new AppError('Not found', 404);
      await repo.delete(story.id);
      res.json({ success: true });
    } catch (err) { next(err); }
  });

  return router;
}

// ─── Cleanup ──────────────────────────────
export function startStoryCleanup(repo: StoryRepository): ReturnType<typeof setInterval> {
  return setInterval(async () => {
    const deleted = await repo.deleteExpired();
    if (deleted > 0) logger.info(`Cleaned up ${deleted} expired stories`);
  }, 10 * 60 * 1000);
}
