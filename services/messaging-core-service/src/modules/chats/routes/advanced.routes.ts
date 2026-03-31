import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuid } from 'uuid';
import crypto from 'crypto';
import { RedisClient, KafkaProducer, authMiddleware, NotFoundError, ValidationError, ForbiddenError, createLogger } from '@tepla/common';
import { EventType, EventTopic, UserId } from '@tepla/types';
import { ChatRepository } from '../repositories/chat.repository';
import { BaseRepository } from '@tepla/common';

const logger = createLogger('advanced-routes');

class AdvancedRepository extends BaseRepository {
  // ─── Admin Log ────────────────────────────
  async logAdminAction(chatId: string, adminId: string, action: string, targetUserId?: string, details?: any) {
    await this.execute(
      `INSERT INTO admin_logs (chat_id, admin_id, action, target_user_id, details) VALUES ($1, $2, $3, $4, $5)`,
      [chatId, adminId, action, targetUserId || null, details ? JSON.stringify(details) : null]
    );
  }

  async getAdminLogs(chatId: string, limit = 50, offset = 0, actionFilter?: string, adminFilter?: string) {
    let query = `SELECT al.*, u1.username as admin_username, u1.display_name as admin_name, u1.avatar_url as admin_avatar,
      u2.username as target_username, u2.display_name as target_name
      FROM admin_logs al
      LEFT JOIN users u1 ON al.admin_id = u1.id
      LEFT JOIN users u2 ON al.target_user_id = u2.id
      WHERE al.chat_id = $1`;
    const params: any[] = [chatId];
    let idx = 2;
    if (actionFilter) { query += ` AND al.action = $${idx}`; params.push(actionFilter); idx++; }
    if (adminFilter) { query += ` AND al.admin_id = $${idx}`; params.push(adminFilter); idx++; }
    query += ` ORDER BY al.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`;
    params.push(limit, offset);
    return this.queryMany(query, params);
  }

  // ─── Join Requests ────────────────────────
  async createJoinRequest(chatId: string, userId: string) {
    return this.queryOne(
      `INSERT INTO join_requests (chat_id, user_id) VALUES ($1, $2) ON CONFLICT (chat_id, user_id) DO UPDATE SET status = 'pending', reviewed_by = NULL, reviewed_at = NULL RETURNING *`,
      [chatId, userId]
    );
  }

  async getJoinRequests(chatId: string, status = 'pending') {
    return this.queryMany(
      `SELECT jr.*, u.username, u.display_name, u.avatar_url FROM join_requests jr JOIN users u ON jr.user_id = u.id WHERE jr.chat_id = $1 AND jr.status = $2 ORDER BY jr.created_at DESC`,
      [chatId, status]
    );
  }

  async reviewJoinRequest(requestId: string, reviewerId: string, status: 'approved' | 'rejected' | 'banned') {
    return this.queryOne(
      `UPDATE join_requests SET status = $1, reviewed_by = $2, reviewed_at = NOW() WHERE id = $3 RETURNING *`,
      [status, reviewerId, requestId]
    );
  }

  async getJoinRequest(requestId: string) {
    return this.queryOne(`SELECT * FROM join_requests WHERE id = $1`, [requestId]);
  }

  // ─── Invite Links ─────────────────────────
  async createInviteLink(chatId: string, createdBy: string, maxUses?: number, expiresAt?: string, requiresApproval = false) {
    const code = crypto.randomBytes(12).toString('base64url');
    return this.queryOne(
      `INSERT INTO invite_links (chat_id, created_by, code, max_uses, expires_at, requires_approval) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [chatId, createdBy, code, maxUses || null, expiresAt || null, requiresApproval]
    );
  }

  async getInviteLinks(chatId: string) {
    return this.queryMany(
      `SELECT il.*, u.username as creator_username FROM invite_links il LEFT JOIN users u ON il.created_by = u.id WHERE il.chat_id = $1 AND il.is_revoked = false ORDER BY il.created_at DESC`,
      [chatId]
    );
  }

  async findInviteByCode(code: string) {
    return this.queryOne(`SELECT * FROM invite_links WHERE code = $1 AND is_revoked = false`, [code]);
  }

  async incrementInviteUses(id: string) {
    await this.execute(`UPDATE invite_links SET uses_count = uses_count + 1 WHERE id = $1`, [id]);
  }

  async revokeInviteLink(id: string) {
    await this.execute(`UPDATE invite_links SET is_revoked = true WHERE id = $1`, [id]);
  }

  // ─── Chat settings ────────────────────────
  async getChatRequiresApproval(chatId: string) {
    const row = await this.queryOne(`SELECT requires_approval FROM chats WHERE id = $1`, [chatId]);
    return row?.requires_approval || false;
  }

  async setAnonymous(chatId: string, userId: string, isAnonymous: boolean) {
    await this.execute(
      `UPDATE chat_members SET is_anonymous = $1 WHERE chat_id = $2 AND user_id = $3`,
      [isAnonymous, chatId, userId]
    );
  }
}

export function advancedRouter(redis: RedisClient, kafka: KafkaProducer): Router {
  const router = Router();
  const auth = authMiddleware();
  const repo = new AdvancedRepository();
  const chatRepo = new ChatRepository();

  // ═══ Admin Log ═══════════════════════════
  router.get('/:chatId/admin-log', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const member = await chatRepo.getMember(req.params.chatId, req.user!.sub);
      if (!member || !['owner', 'admin'].includes(member.role)) throw new ForbiddenError('Admins only');
      const { limit = '50', offset = '0', action, admin } = req.query as Record<string, string>;
      const logs = await repo.getAdminLogs(req.params.chatId, parseInt(limit), parseInt(offset), action, admin);
      res.json({ success: true, data: logs });
    } catch (err) { next(err); }
  });

  // ═══ Join Requests ═══════════════════════
  router.post('/:chatId/join', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requiresApproval = await repo.getChatRequiresApproval(req.params.chatId);
      if (requiresApproval) {
        const request = await repo.createJoinRequest(req.params.chatId, req.user!.sub);
        res.json({ success: true, data: { message: 'Request submitted', request } });
      } else {
        await chatRepo.addMember(req.params.chatId, req.user!.sub, 'member' as any);
        await chatRepo.updateMembersCount(req.params.chatId);
        res.json({ success: true, data: { message: 'Joined' } });
      }
    } catch (err) { next(err); }
  });

  router.get('/:chatId/join-requests', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const member = await chatRepo.getMember(req.params.chatId, req.user!.sub);
      if (!member || !['owner', 'admin'].includes(member.role)) throw new ForbiddenError('Admins only');
      const status = (req.query.status as string) || 'pending';
      const requests = await repo.getJoinRequests(req.params.chatId, status);
      res.json({ success: true, data: requests });
    } catch (err) { next(err); }
  });

  router.post('/:chatId/join-requests/:requestId/approve', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const member = await chatRepo.getMember(req.params.chatId, req.user!.sub);
      if (!member || !['owner', 'admin'].includes(member.role)) throw new ForbiddenError('Admins only');
      const jr = await repo.getJoinRequest(req.params.requestId);
      if (!jr) throw new NotFoundError('Join request');
      await repo.reviewJoinRequest(req.params.requestId, req.user!.sub, 'approved');
      await chatRepo.addMember(req.params.chatId, jr.user_id, 'member' as any);
      await chatRepo.updateMembersCount(req.params.chatId);
      await repo.logAdminAction(req.params.chatId, req.user!.sub, 'member_approved', jr.user_id);
      res.json({ success: true, data: { message: 'Approved' } });
    } catch (err) { next(err); }
  });

  router.post('/:chatId/join-requests/:requestId/reject', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const member = await chatRepo.getMember(req.params.chatId, req.user!.sub);
      if (!member || !['owner', 'admin'].includes(member.role)) throw new ForbiddenError('Admins only');
      const jr = await repo.getJoinRequest(req.params.requestId);
      if (!jr) throw new NotFoundError('Join request');
      await repo.reviewJoinRequest(req.params.requestId, req.user!.sub, 'rejected');
      await repo.logAdminAction(req.params.chatId, req.user!.sub, 'member_rejected', jr.user_id);
      res.json({ success: true, data: { message: 'Rejected' } });
    } catch (err) { next(err); }
  });

  // ═══ Invite Links ════════════════════════
  router.post('/:chatId/invite-links', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const member = await chatRepo.getMember(req.params.chatId, req.user!.sub);
      if (!member || !['owner', 'admin'].includes(member.role)) throw new ForbiddenError('Admins only');
      const { maxUses, expiresAt, requiresApproval } = req.body;
      const link = await repo.createInviteLink(req.params.chatId, req.user!.sub, maxUses, expiresAt, requiresApproval);
      await repo.logAdminAction(req.params.chatId, req.user!.sub, 'invite_link_created', undefined, { code: link.code });
      res.status(201).json({ success: true, data: link });
    } catch (err) { next(err); }
  });

  router.get('/:chatId/invite-links', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const member = await chatRepo.getMember(req.params.chatId, req.user!.sub);
      if (!member || !['owner', 'admin'].includes(member.role)) throw new ForbiddenError('Admins only');
      const links = await repo.getInviteLinks(req.params.chatId);
      res.json({ success: true, data: links });
    } catch (err) { next(err); }
  });

  router.delete('/:chatId/invite-links/:linkId', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const member = await chatRepo.getMember(req.params.chatId, req.user!.sub);
      if (!member || !['owner', 'admin'].includes(member.role)) throw new ForbiddenError('Admins only');
      await repo.revokeInviteLink(req.params.linkId);
      await repo.logAdminAction(req.params.chatId, req.user!.sub, 'invite_link_revoked');
      res.json({ success: true, data: { message: 'Revoked' } });
    } catch (err) { next(err); }
  });

  // POST /invite/:code/join — public join via invite link
  router.post('/invite/:code/join', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const link = await repo.findInviteByCode(req.params.code);
      if (!link) throw new NotFoundError('Invite link not found or expired');
      if (link.expires_at && new Date(link.expires_at) < new Date()) throw new ValidationError('Invite link expired');
      if (link.max_uses && link.uses_count >= link.max_uses) throw new ValidationError('Invite link usage limit reached');

      if (link.requires_approval) {
        await repo.createJoinRequest(link.chat_id, req.user!.sub);
        await repo.incrementInviteUses(link.id);
        res.json({ success: true, data: { message: 'Request submitted', requiresApproval: true } });
      } else {
        await chatRepo.addMember(link.chat_id, req.user!.sub, 'member' as any);
        await chatRepo.updateMembersCount(link.chat_id);
        await repo.incrementInviteUses(link.id);
        await redis.del(`chats:user:${req.user!.sub}`);
        res.json({ success: true, data: { message: 'Joined', chatId: link.chat_id } });
      }
    } catch (err) { next(err); }
  });

  // ═══ Anonymous Admin ═════════════════════
  router.patch('/:chatId/members/:userId/anonymous', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const member = await chatRepo.getMember(req.params.chatId, req.user!.sub);
      if (!member || !['owner', 'admin'].includes(member.role)) throw new ForbiddenError('Admins only');
      if (req.params.userId !== req.user!.sub) throw new ForbiddenError('Can only toggle own anonymous mode');
      const { isAnonymous } = req.body;
      await repo.setAnonymous(req.params.chatId, req.params.userId, !!isAnonymous);
      await repo.logAdminAction(req.params.chatId, req.user!.sub, 'anonymous_toggled', undefined, { isAnonymous });
      res.json({ success: true, data: { message: isAnonymous ? 'Now posting as group' : 'Now posting as yourself' } });
    } catch (err) { next(err); }
  });

  // ═══ Slow Mode ═══════════════════════════
  router.patch('/:chatId/slow-mode', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const member = await chatRepo.getMember(req.params.chatId, req.user!.sub);
      if (!member || !['owner', 'admin'].includes(member.role)) throw new ForbiddenError('Admins only');
      const { seconds } = req.body;
      const allowed = [0, 10, 30, 60, 300, 3600];
      if (!allowed.includes(seconds)) throw new ValidationError(`seconds must be one of: ${allowed.join(', ')}`);
      await new BaseRepository().execute(`UPDATE chats SET slow_mode_seconds = $1 WHERE id = $2`, [seconds, req.params.chatId]);
      await repo.logAdminAction(req.params.chatId, req.user!.sub, 'slow_mode_changed', undefined, { seconds });
      res.json({ success: true, data: { message: 'Slow mode updated', slowModeSeconds: seconds } });
    } catch (err) { next(err); }
  });

  return router;
}
