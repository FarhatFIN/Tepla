import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuid } from 'uuid';
import { RedisClient, KafkaProducer, authMiddleware, NotFoundError, ValidationError, ForbiddenError, createLogger, BaseRepository } from '@tepla/common';
import { ChatRole, ChatPermissions, DEFAULT_MEMBER_PERMISSIONS, ADMIN_PERMISSIONS, EventType, EventTopic, UserId } from '@tepla/types';

const logger = createLogger('roles-routes');

class RoleRepository extends BaseRepository {
  async getMember(chatId: string, userId: string): Promise<any> {
    return this.queryOne(`SELECT * FROM chat_members WHERE chat_id = $1 AND user_id = $2`, [chatId, userId]);
  }

  async setRole(chatId: string, userId: string, role: ChatRole): Promise<void> {
    await this.execute(
      `UPDATE chat_members SET role = $1 WHERE chat_id = $2 AND user_id = $3`,
      [role, chatId, userId]
    );
  }

  async setPermissions(chatId: string, userId: string, permissions: ChatPermissions): Promise<void> {
    await this.execute(
      `UPDATE chat_members SET permissions = $1 WHERE chat_id = $2 AND user_id = $3`,
      [JSON.stringify(permissions), chatId, userId]
    );
  }

  async setCustomTitle(chatId: string, userId: string, title: string | null): Promise<void> {
    await this.execute(
      `UPDATE chat_members SET custom_title = $1 WHERE chat_id = $2 AND user_id = $3`,
      [title, chatId, userId]
    );
  }

  async getMembers(chatId: string, role?: ChatRole, limit = 100): Promise<any[]> {
    if (role) {
      return this.queryMany(
        `SELECT cm.*, u.username, u.display_name, u.avatar_url FROM chat_members cm
         JOIN users u ON u.id = cm.user_id
         WHERE cm.chat_id = $1 AND cm.role = $2 ORDER BY cm.joined_at LIMIT $3`,
        [chatId, role, limit]
      );
    }
    return this.queryMany(
      `SELECT cm.*, u.username, u.display_name, u.avatar_url FROM chat_members cm
       JOIN users u ON u.id = cm.user_id
       WHERE cm.chat_id = $1 ORDER BY CASE cm.role
         WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 WHEN 'member' THEN 2
         WHEN 'restricted' THEN 3 WHEN 'banned' THEN 4 END, cm.joined_at LIMIT $2`,
      [chatId, limit]
    );
  }

  async banMember(chatId: string, userId: string, until?: string): Promise<void> {
    await this.execute(
      `UPDATE chat_members SET role = 'banned', muted_until = $1 WHERE chat_id = $2 AND user_id = $3`,
      [until || null, chatId, userId]
    );
  }

  async restrictMember(chatId: string, userId: string, permissions: ChatPermissions, until?: string): Promise<void> {
    await this.execute(
      `UPDATE chat_members SET role = 'restricted', permissions = $1, muted_until = $2 WHERE chat_id = $3 AND user_id = $4`,
      [JSON.stringify(permissions), until || null, chatId, userId]
    );
  }
}

function canManage(actorRole: ChatRole, targetRole: ChatRole): boolean {
  const hierarchy: Record<string, number> = { owner: 4, admin: 3, member: 2, restricted: 1, banned: 0 };
  return (hierarchy[actorRole] || 0) > (hierarchy[targetRole] || 0);
}

export function rolesRouter(redis: RedisClient, kafka: KafkaProducer): Router {
  const router = Router();
  const auth = authMiddleware();
  const repo = new RoleRepository();

  // GET /api/roles/:chatId/members — list members with roles
  router.get('/:chatId/members', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { role, limit } = req.query;
      const members = await repo.getMembers(req.params.chatId, role as ChatRole, parseInt(limit as string) || 100);
      res.json({ success: true, data: members });
    } catch (err) { next(err); }
  });

  // POST /api/roles/:chatId/promote — promote to admin
  router.post('/:chatId/promote', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, permissions, customTitle } = req.body;
      const chatId = req.params.chatId;

      const actor = await repo.getMember(chatId, req.user!.sub);
      if (!actor || (actor.role !== ChatRole.OWNER && actor.role !== ChatRole.ADMIN)) {
        throw new ForbiddenError('Only owners and admins can promote');
      }

      const target = await repo.getMember(chatId, userId);
      if (!target) throw new NotFoundError('Member');

      await repo.setRole(chatId, userId, ChatRole.ADMIN);
      if (permissions) await repo.setPermissions(chatId, userId, permissions);
      if (customTitle) await repo.setCustomTitle(chatId, userId, customTitle);

      await kafka.publish({
        id: uuid(),
        type: EventType.MEMBER_ROLE_CHANGED,
        topic: EventTopic.CHAT_EVENTS,
        timestamp: new Date().toISOString(),
        source: 'chat-service',
        correlationId: uuid(),
        userId: req.user!.sub as UserId,
        payload: { chatId, userId, newRole: ChatRole.ADMIN, promotedBy: req.user!.sub },
      });

      res.json({ success: true });
    } catch (err) { next(err); }
  });

  // POST /api/roles/:chatId/demote — demote to member
  router.post('/:chatId/demote', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.body;
      const chatId = req.params.chatId;
      const actor = await repo.getMember(chatId, req.user!.sub);
      if (!actor || actor.role !== ChatRole.OWNER) throw new ForbiddenError('Only owner can demote');
      await repo.setRole(chatId, userId, ChatRole.MEMBER);
      await repo.setPermissions(chatId, userId, DEFAULT_MEMBER_PERMISSIONS);
      await repo.setCustomTitle(chatId, userId, null);

      await kafka.publish({
        id: uuid(),
        type: EventType.MEMBER_ROLE_CHANGED,
        topic: EventTopic.CHAT_EVENTS,
        timestamp: new Date().toISOString(),
        source: 'chat-service',
        correlationId: uuid(),
        userId: req.user!.sub as UserId,
        payload: { chatId, userId, newRole: ChatRole.MEMBER },
      });

      res.json({ success: true });
    } catch (err) { next(err); }
  });

  // POST /api/roles/:chatId/ban
  router.post('/:chatId/ban', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, until } = req.body;
      const chatId = req.params.chatId;
      const actor = await repo.getMember(chatId, req.user!.sub);
      const target = await repo.getMember(chatId, userId);
      if (!actor || !target) throw new NotFoundError('Member');
      if (!canManage(actor.role, target.role)) throw new ForbiddenError('Cannot ban higher role');

      await repo.banMember(chatId, userId, until);
      res.json({ success: true });
    } catch (err) { next(err); }
  });

  // POST /api/roles/:chatId/restrict
  router.post('/:chatId/restrict', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, permissions, until } = req.body;
      const chatId = req.params.chatId;
      const actor = await repo.getMember(chatId, req.user!.sub);
      const target = await repo.getMember(chatId, userId);
      if (!actor || !target) throw new NotFoundError('Member');
      if (!canManage(actor.role, target.role)) throw new ForbiddenError('Cannot restrict higher role');

      await repo.restrictMember(chatId, userId, permissions || DEFAULT_MEMBER_PERMISSIONS, until);
      res.json({ success: true });
    } catch (err) { next(err); }
  });

  // POST /api/roles/:chatId/transfer-ownership
  router.post('/:chatId/transfer-ownership', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.body;
      const chatId = req.params.chatId;
      const actor = await repo.getMember(chatId, req.user!.sub);
      if (!actor || actor.role !== ChatRole.OWNER) throw new ForbiddenError('Only owner');
      await repo.setRole(chatId, req.user!.sub, ChatRole.ADMIN);
      await repo.setRole(chatId, userId, ChatRole.OWNER);
      res.json({ success: true });
    } catch (err) { next(err); }
  });

  return router;
}
