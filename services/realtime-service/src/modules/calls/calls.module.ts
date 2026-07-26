// ============================================
// Tepla Messenger — Calls Module
// WebRTC voice/video calls via LiveKit SFU
// ============================================

import { Router } from 'express';
import { randomUUID } from 'crypto';
import {
  BaseRepository,
  KafkaProducer,
  RedisClient,
  assertUuid,
  createLogger,
  authMiddleware,
  db,
  AppError,
} from '@tepla/common';
import {
  CallId,
  CallType,
  CallStatus,
  Call,
  UserId,
  ChatId,
  EventTopic,
  EventType,
  ApiResponse,
} from '@tepla/types';

const logger = createLogger('calls-module');

// ─── Config ────────────────────────────────
const LIVEKIT_API_URL = process.env.LIVEKIT_API_URL || 'http://livekit:7880';
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;
const MAX_GROUP_CALL_PARTICIPANTS = 100;
const VALID_CALL_TYPES = new Set(['audio', 'video']);
const VALID_TOGGLE_ACTIONS = new Set(['mute', 'video', 'screen']);

if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
  throw new Error('FATAL: LIVEKIT_API_KEY and LIVEKIT_API_SECRET environment variables are required');
}

// ─── Repository ────────────────────────────
export class CallRepository extends BaseRepository {
  async createCall(call: Omit<Call, 'participants'>): Promise<Call> {
    const row = await this.queryOne<any>(
      `INSERT INTO calls (id, chat_id, initiator_id, type, status, is_group, livekit_room, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING *`,
      [call.id, call.chatId, call.initiatorId, call.type, call.status, call.isGroup, call.livekitRoom]
    );
    return { ...this.mapCall(row), participants: [] };
  }

  async getCall(callId: CallId): Promise<Call | null> {
    const row = await this.queryOne<any>(
      `SELECT c.*, json_agg(cp.*) FILTER (WHERE cp.user_id IS NOT NULL) as participants
       FROM calls c
       LEFT JOIN call_participants cp ON cp.call_id = c.id
       WHERE c.id = $1
       GROUP BY c.id`,
      [callId]
    );
    if (!row) return null;
    return this.mapCall(row);
  }

  async getActiveCallInChat(chatId: ChatId): Promise<Call | null> {
    const row = await this.queryOne<any>(
      `SELECT c.*, json_agg(cp.*) FILTER (WHERE cp.user_id IS NOT NULL) as participants
       FROM calls c
       LEFT JOIN call_participants cp ON cp.call_id = c.id
       WHERE c.chat_id = $1 AND c.status IN ('ringing', 'active')
       GROUP BY c.id
       LIMIT 1`,
      [chatId]
    );
    if (!row) return null;
    return this.mapCall(row);
  }

  async updateCallStatus(callId: CallId, status: CallStatus): Promise<void> {
    const extra = status === CallStatus.ACTIVE ? ", started_at = NOW()" :
                  status === CallStatus.ENDED ? ", ended_at = NOW(), duration = EXTRACT(EPOCH FROM (NOW() - started_at))::int" : "";
    await this.execute(
      `UPDATE calls SET status = $1${extra} WHERE id = $2`,
      [status, callId]
    );
  }

  async addParticipant(callId: CallId, userId: UserId): Promise<void> {
    await this.execute(
      `INSERT INTO call_participants (call_id, user_id, joined_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (call_id, user_id) DO UPDATE SET left_at = NULL, joined_at = NOW()`,
      [callId, userId]
    );
  }

  async removeParticipant(callId: CallId, userId: UserId): Promise<void> {
    await this.execute(
      `UPDATE call_participants SET left_at = NOW() WHERE call_id = $1 AND user_id = $2 AND left_at IS NULL`,
      [callId, userId]
    );
  }

  async getActiveParticipantCount(callId: CallId): Promise<number> {
    const row = await this.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM call_participants WHERE call_id = $1 AND left_at IS NULL`,
      [callId]
    );
    return parseInt(row?.count || '0', 10);
  }

  async getUserCallHistory(userId: UserId, limit = 50): Promise<Call[]> {
    const rows = await this.queryMany<any>(
      `SELECT c.*, json_agg(cp.*) FILTER (WHERE cp.user_id IS NOT NULL) as participants
       FROM calls c
       JOIN call_participants cp2 ON cp2.call_id = c.id AND cp2.user_id = $1
       LEFT JOIN call_participants cp ON cp.call_id = c.id
       WHERE c.status = 'ended'
       GROUP BY c.id
       ORDER BY c.created_at DESC
       LIMIT $2`,
      [userId, limit]
    );
    return rows.map(r => this.mapCall(r));
  }

  private mapCall(row: any): Call {
    const participants = (row.participants || []).filter(Boolean).map((p: any) => ({
      userId: p.user_id as UserId,
      joinedAt: p.joined_at,
      leftAt: p.left_at,
      isMuted: p.is_muted || false,
      isVideoOn: p.is_video_on || false,
      isScreenSharing: p.is_screen_sharing || false,
    }));
    return {
      id: row.id as CallId,
      chatId: row.chat_id as ChatId,
      initiatorId: row.initiator_id as UserId,
      type: row.type as CallType,
      status: row.status as CallStatus,
      isGroup: row.is_group,
      participants,
      livekitRoom: row.livekit_room,
      recordingUrl: row.recording_url,
      startedAt: row.started_at,
      endedAt: row.ended_at,
      duration: row.duration,
      createdAt: row.created_at,
    };
  }
}

// ─── LiveKit Token Generator ───────────────
/**
 * Mint a LiveKit access token.
 *
 * C-03: this used to wrap the whole body in a `try/catch` whose fallback
 * returned `base64(JSON.stringify(payload))` — an **unsigned** blob presented
 * as a token. A transient failure importing `livekit-server-sdk` therefore
 * downgraded call authentication to nothing at all, silently, in production.
 * There is no safe fallback for "we cannot sign"; let it fail.
 */
export async function generateLiveKitToken(roomName: string, participantId: string, canPublish = true): Promise<string> {
  const { AccessToken } = await import('livekit-server-sdk');
  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity: participantId,
    ttl: '1h',
  });
  at.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish,
    canSubscribe: true,
    canPublishData: true,
  });
  return at.toJwt();
}

// ─── Authorization helpers ─────────────────
//
// C-02: none of these checks existed. Every route below took a call id or a
// chat id straight from the request and acted on it, so any authenticated
// account could:
//   • start a call in a chat it is not a member of;
//   • join *any* call by id and receive a LiveKit **publish** token — i.e.
//     listen in on, and speak into, a conversation between strangers;
//   • end or decline anyone's call (`/leave` on a 1:1 ringing call ends it even
//     for a non-participant, because `remaining <= 1` was true);
//   • read call metadata and see who is currently talking to whom.

/** Throw unless `userId` is a member of `chatId`. */
async function requireChatMember(chatId: ChatId, userId: UserId): Promise<void> {
  assertUuid(chatId, 'chatId');
  const row = await db.queryRow(
    'SELECT 1 FROM chat_members WHERE chat_id = $1 AND user_id = $2 LIMIT 1',
    [chatId, userId],
  );
  if (!row) throw new AppError('Not a member of this chat', 403);
}

/**
 * Load a call and confirm the caller is entitled to it.
 *
 * Entitlement is membership of the call's chat — that is what makes someone a
 * legitimate ringee. Requiring an existing `call_participants` row instead
 * would break the very first join.
 */
async function loadAuthorizedCall(repo: CallRepository, callId: CallId, userId: UserId): Promise<Call> {
  assertUuid(callId, 'callId');
  const call = await repo.getCall(callId);
  if (!call) throw new AppError('Call not found', 404);
  await requireChatMember(call.chatId, userId);
  return call;
}

// ─── Router Factory ────────────────────────
export function callsRouter(redis: RedisClient, kafka: KafkaProducer): Router {
  const router = Router();
  const repo = new CallRepository();

  // ── Start a call ──
  router.post('/start', authMiddleware(), async (req, res, next) => {
    try {
      const userId = req.user!.sub;
      const { chatId, type, isGroup } = (req.body ?? {}) as { chatId: ChatId; type: CallType; isGroup?: boolean };

      if (!chatId) throw new AppError('chatId is required', 400);
      if (!VALID_CALL_TYPES.has(String(type))) {
        throw new AppError('type must be "audio" or "video"', 400);
      }
      await requireChatMember(chatId, userId);

      // Check for existing active call
      const existing = await repo.getActiveCallInChat(chatId);
      if (existing) {
        // Join existing call instead
        return res.json({ success: true, data: { call: existing, action: 'join_existing' } });
      }

      const callId = randomUUID() as CallId;
      const roomName = `tepla-${chatId}-${callId}`;

      const call = await repo.createCall({
        id: callId,
        chatId,
        initiatorId: userId,
        type,
        status: CallStatus.RINGING,
        isGroup: isGroup || false,
        livekitRoom: roomName,
        recordingUrl: null,
        startedAt: null,
        endedAt: null,
        duration: null,
        createdAt: new Date().toISOString(),
      });

      await repo.addParticipant(callId, userId);

      const token = await generateLiveKitToken(roomName, userId);

      await kafka.publish( {
        id: randomUUID(),
        type: EventType.CALL_STARTED,
        topic: EventTopic.CALL_EVENTS,
        timestamp: new Date().toISOString(),
        source: 'calls-service',
        correlationId: req.headers['x-correlation-id'] as string || randomUUID(),
        userId,
        payload: { call, chatId },
      });

      res.json({ success: true, data: { call, token, livekitUrl: LIVEKIT_API_URL } } as ApiResponse);
    } catch (err) { next(err); }
  });

  // ── Join a call ──
  router.post('/:callId/join', authMiddleware(), async (req, res, next) => {
    try {
      const userId = req.user!.sub;
      const callId = req.params.callId as CallId;
      const call = await loadAuthorizedCall(repo, callId, userId);
      if (call.status !== CallStatus.RINGING && call.status !== CallStatus.ACTIVE) {
        throw new AppError('Call not found or already ended', 404);
      }

      const participantCount = await repo.getActiveParticipantCount(callId);
      if (call.isGroup && participantCount >= MAX_GROUP_CALL_PARTICIPANTS) {
        throw new AppError('Call is full', 403);
      }

      if (call.status === CallStatus.RINGING) {
        await repo.updateCallStatus(callId, CallStatus.ACTIVE);
      }

      await repo.addParticipant(callId, userId);
      const token = await generateLiveKitToken(call.livekitRoom!, userId);

      await kafka.publish( {
        id: randomUUID(),
        type: EventType.CALL_PARTICIPANT_JOINED,
        topic: EventTopic.CALL_EVENTS,
        timestamp: new Date().toISOString(),
        source: 'calls-service',
        correlationId: randomUUID(),
        userId,
        payload: { callId, chatId: call.chatId },
      });

      res.json({ success: true, data: { call: await repo.getCall(callId), token, livekitUrl: LIVEKIT_API_URL } });
    } catch (err) { next(err); }
  });

  // ── Leave / End a call ──
  router.post('/:callId/leave', authMiddleware(), async (req, res, next) => {
    try {
      const userId = req.user!.sub;
      const callId = req.params.callId as CallId;
      const call = await loadAuthorizedCall(repo, callId, userId);

      // Only an actual participant may collapse the call. Without this, any
      // chat member could POST /leave on a ringing 1:1 call and end it, because
      // `remaining <= 1` was already true before they "left".
      const wasParticipant = call.participants.some((p) => p.userId === userId && !p.leftAt);
      if (!wasParticipant) {
        return res.json({ success: true, data: { left: false } });
      }

      await repo.removeParticipant(callId, userId);

      const remaining = await repo.getActiveParticipantCount(callId);
      if (remaining === 0 || (!call.isGroup && remaining <= 1)) {
        await repo.updateCallStatus(callId, CallStatus.ENDED);
        await kafka.publish( {
          id: randomUUID(),
          type: EventType.CALL_ENDED,
          topic: EventTopic.CALL_EVENTS,
          timestamp: new Date().toISOString(),
          source: 'calls-service',
          correlationId: randomUUID(),
          userId,
          payload: { callId, chatId: call.chatId, duration: call.duration },
        });
      } else {
        await kafka.publish( {
          id: randomUUID(),
          type: EventType.CALL_PARTICIPANT_LEFT,
          topic: EventTopic.CALL_EVENTS,
          timestamp: new Date().toISOString(),
          source: 'calls-service',
          correlationId: randomUUID(),
          userId,
          payload: { callId, chatId: call.chatId },
        });
      }

      res.json({ success: true });
    } catch (err) { next(err); }
  });

  // ── Decline a call ──
  router.post('/:callId/decline', authMiddleware(), async (req, res, next) => {
    try {
      const callId = req.params.callId as CallId;
      const call = await loadAuthorizedCall(repo, callId, req.user!.sub);
      if (call.status !== CallStatus.RINGING) throw new AppError('Call not found', 404);

      const remaining = await repo.getActiveParticipantCount(callId);
      if (!call.isGroup || remaining <= 1) {
        await repo.updateCallStatus(callId, CallStatus.DECLINED);
        await kafka.publish({
          id: randomUUID(),
          type: EventType.CALL_ENDED,
          topic: EventTopic.CALL_EVENTS,
          timestamp: new Date().toISOString(),
          source: 'calls-service',
          correlationId: randomUUID(),
          userId: req.user!.sub,
          payload: { callId, chatId: call.chatId, declined: true },
        });
      }

      res.json({ success: true });
    } catch (err) { next(err); }
  });

  // ── Call history (must be registered before /:callId) ──
  router.get('/history', authMiddleware(), async (req, res, next) => {
    try {
      const calls = await repo.getUserCallHistory(req.user!.sub, parseInt(req.query.limit as string) || 50);
      res.json({ success: true, data: calls });
    } catch (err) { next(err); }
  });

  // ── Get call info ──
  router.get('/:callId', authMiddleware(), async (req, res, next) => {
    try {
      const call = await loadAuthorizedCall(repo, req.params.callId as CallId, req.user!.sub);
      res.json({ success: true, data: call });
    } catch (err) { next(err); }
  });

  // ── Active call in chat ──
  router.get('/chat/:chatId/active', authMiddleware(), async (req, res, next) => {
    try {
      const chatId = req.params.chatId as ChatId;
      await requireChatMember(chatId, req.user!.sub);
      const call = await repo.getActiveCallInChat(chatId);
      res.json({ success: true, data: call });
    } catch (err) { next(err); }
  });

  // ── Toggle mute/video/screenshare (signaling via Redis pub/sub) ──
  router.post('/:callId/toggle', authMiddleware(), async (req, res, next) => {
    try {
      const { type } = (req.body ?? {}) as { type?: string };
      if (!VALID_TOGGLE_ACTIONS.has(String(type))) {
        throw new AppError('type must be "mute", "video" or "screen"', 400);
      }

      const callId = req.params.callId as CallId;
      const call = await loadAuthorizedCall(repo, callId, req.user!.sub);
      // Only someone actually in the call may broadcast state for it.
      if (!call.participants.some((p) => p.userId === req.user!.sub && !p.leftAt)) {
        throw new AppError('Not a participant of this call', 403);
      }

      await redis.publish(`call:${callId}:signal`, JSON.stringify({
        userId: req.user!.sub,
        action: type,
        timestamp: Date.now(),
      }));
      res.json({ success: true });
    } catch (err) { next(err); }
  });

  return router;
}
