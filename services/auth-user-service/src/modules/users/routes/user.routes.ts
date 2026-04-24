import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuid } from 'uuid';
import { RedisClient, KafkaProducer, authMiddleware, NotFoundError, ValidationError, ForbiddenError, createLogger } from '@tepla/common';
import { EventType, EventTopic, UserId } from '@tepla/types';

const logger = createLogger('user-routes');

export function userRouter(redis: RedisClient, kafka: KafkaProducer): Router {
  const router = Router();
  const auth = authMiddleware();
  const { UserRepository } = require('../repositories/user.repository');
  const userRepo = new UserRepository();

  // GET /api/users/check-username?username=... — check username availability
  router.get('/check-username', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const username = (req.query.username as string || '').trim().toLowerCase();
      if (username.length < 3) throw new ValidationError('Username must be at least 3 characters');
      if (username.length > 32) throw new ValidationError('Username must be at most 32 characters');
      if (!/^[a-z0-9_]+$/.test(username)) throw new ValidationError('Username can only contain a-z, 0-9 and _');

      const reserved = ['admin', 'tepla', 'support', 'help', 'system', 'bot', 'official', 'moderator'];
      if (reserved.includes(username)) {
        return res.json({ success: true, data: { available: false, reason: 'reserved' } });
      }

      const existing = await userRepo.findByUsername(username);
      res.json({ success: true, data: { available: !existing, reason: existing ? 'taken' : null } });
    } catch (err) { next(err); }
  });

  // GET /api/users/search?q=...
  router.get('/search', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const q = (req.query.q as string || '').trim();
      if (q.length < 2) throw new ValidationError('Query must be at least 2 characters');

      const cacheKey = `search:users:${q.toLowerCase()}`;
      const cached = await redis.getJson<any[]>(cacheKey);
      if (cached) {
        return res.json({ success: true, data: cached });
      }

      const users = await userRepo.search(q, 20);
      await redis.setJson(cacheKey, users, 60); // cache 1 min

      res.json({ success: true, data: users });
    } catch (err) { next(err); }
  });

  // GET /api/users/:id
  router.get('/:id', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const cached = await redis.getJson<any>(`user:${req.params.id}`);
      if (cached) return res.json({ success: true, data: cached });

      const user = await userRepo.findById(req.params.id);
      if (!user) throw new NotFoundError('User', req.params.id);

      const profile = mapProfile(user);
      await redis.setJson(`user:${req.params.id}`, profile, 300); // 5 min cache

      res.json({ success: true, data: profile });
    } catch (err) { next(err); }
  });

  // PATCH /api/users/:id — update profile
  router.patch('/:id', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.user!.sub !== req.params.id) {
        throw new ForbiddenError('Cannot update other user profiles');
      }

      // Handle username change separately (needs validation + uniqueness check)
      if (req.body.username !== undefined) {
        const newUsername = req.body.username.trim().toLowerCase();
        if (newUsername.length < 3 || newUsername.length > 32) {
          throw new ValidationError('Username must be 3-32 characters');
        }
        if (!/^[a-z0-9_]+$/.test(newUsername)) {
          throw new ValidationError('Username can only contain a-z, 0-9 and _');
        }
        const reserved = ['admin', 'tepla', 'support', 'help', 'system', 'bot', 'official', 'moderator'];
        if (reserved.includes(newUsername)) {
          throw new ValidationError('This username is reserved');
        }
        const existing = await userRepo.findByUsername(newUsername);
        if (existing && existing.id !== req.params.id) {
          throw new ValidationError('Username is already taken');
        }
      }

      const allowed = ['username', 'displayName', 'bio', 'avatarUrl', 'statusEmoji', 'statusText',
        'usernameColor', 'animatedAvatarEnabled', 'voiceStatusUrl', 'language', 'birthDate'];
      const updates: Record<string, any> = {};
      for (const key of allowed) {
        if (req.body[key] !== undefined) {
          updates[toSnakeCase(key)] = key === 'username' ? req.body[key].trim().toLowerCase() : req.body[key];
        }
      }

      if (Object.keys(updates).length === 0) {
        throw new ValidationError('No valid fields to update');
      }

      const user = await userRepo.update(req.params.id, updates);
      await redis.del(`user:${req.params.id}`);

      await kafka.publish({
        id: uuid(),
        type: EventType.USER_UPDATED,
        topic: EventTopic.USER_EVENTS,
        timestamp: new Date().toISOString(),
        source: 'user-service',
        correlationId: req.correlationId || uuid(),
        userId: req.params.id as UserId,
        payload: { userId: req.params.id, fields: Object.keys(updates) },
      });

      res.json({ success: true, data: mapProfile(user) });
    } catch (err) { next(err); }
  });

  // GET /api/users/:id/settings
  router.get('/:id/settings', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.user!.sub !== req.params.id) throw new ForbiddenError();
      const settings = await userRepo.getSettings(req.params.id);
      res.json({ success: true, data: settings });
    } catch (err) { next(err); }
  });

  // PATCH /api/users/:id/settings
  router.patch('/:id/settings', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.user!.sub !== req.params.id) throw new ForbiddenError();
      const settings = await userRepo.updateSettings(req.params.id, req.body);
      res.json({ success: true, data: settings });
    } catch (err) { next(err); }
  });

  // ─── Contacts ───────────────────────────────

  // GET /api/users/:id/contacts
  router.get('/:id/contacts', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.user!.sub !== req.params.id) throw new ForbiddenError();
      const contacts = await userRepo.getContacts(req.params.id);
      res.json({ success: true, data: contacts });
    } catch (err) { next(err); }
  });

  // POST /api/users/:id/contacts — add contact
  router.post('/:id/contacts', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.user!.sub !== req.params.id) throw new ForbiddenError();
      const { contactUserId } = req.body;
      if (!contactUserId) throw new ValidationError('contactUserId is required');
      if (contactUserId === req.params.id) throw new ValidationError('Cannot add yourself');

      const targetUser = await userRepo.findById(contactUserId);
      if (!targetUser) throw new NotFoundError('User', contactUserId);

      await userRepo.addContact(req.params.id, contactUserId);
      res.status(201).json({ success: true, data: { message: 'Contact added' } });
    } catch (err) { next(err); }
  });

  // DELETE /api/users/:id/contacts/:contactUserId
  router.delete('/:id/contacts/:contactUserId', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.user!.sub !== req.params.id) throw new ForbiddenError();
      await userRepo.removeContact(req.params.id, req.params.contactUserId);
      res.json({ success: true, data: { message: 'Contact removed' } });
    } catch (err) { next(err); }
  });

  // POST /api/users/:id/contacts/:contactUserId/block
  router.post('/:id/contacts/:contactUserId/block', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.user!.sub !== req.params.id) throw new ForbiddenError();
      await userRepo.blockUser(req.params.id, req.params.contactUserId);
      res.json({ success: true, data: { message: 'User blocked' } });
    } catch (err) { next(err); }
  });

  // POST /api/users/:id/contacts/:contactUserId/unblock
  router.post('/:id/contacts/:contactUserId/unblock', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.user!.sub !== req.params.id) throw new ForbiddenError();
      await userRepo.unblockUser(req.params.id, req.params.contactUserId);
      res.json({ success: true, data: { message: 'User unblocked' } });
    } catch (err) { next(err); }
  });

  return router;
}

function mapProfile(row: any) {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    bio: row.bio,
    birthDate: row.birth_date,
    usernameColor: row.username_color,
    animatedAvatarEnabled: row.avatar_animation_enabled,
    voiceStatusUrl: row.voice_status_url,
    statusEmoji: row.status_emoji,
    statusText: row.status_text,
    isOnline: row.is_online,
    isVerified: row.is_verified,
    lastSeen: row.last_seen,
    language: row.language,
    publicKey: row.public_key,
    createdAt: row.created_at,
  };
}

function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase());
}
