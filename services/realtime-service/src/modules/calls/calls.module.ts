// ============================================
// Tepla Messenger — Calls Module
// WebRTC voice/video calls via LiveKit SFU
// ============================================

import { Router } from 'express';
import {
  BaseRepository,
  KafkaProducer,
  RedisClient,
  createLogger,
  authMiddleware,
  AppError,
} from '@tepla/common';
import {
  CallId,
  CallType,
  CallStatus,
  Call,
  CallParticipant,
  UserId,
  ChatId,
  EventTopic,
  EventType,
  ApiResponse,
} from '@tepla/types';

const logger = createLogger('calls-module');

// ─── Config ────────────────────────────────
const LIVEKIT_API_URL = process.env.LIVEKIT_API_URL || 'http://livekit:7880';
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || 'devkey';
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || 'devsecret';
const MAX_GROUP_CALL_PARTICIPANTS = 100;

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
export async function generateLiveKitToken(roomName: string, participantId: string, canPublish = true): Promise<string> {
  try {
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
    return await at.toJwt();
  } catch {
    // Fallback for dev mode without LiveKit SDK
    const payload = {
      iss: LIVEKIT_API_KEY,
      sub: participantId,
      jti: `${participantId}-${Date.now()}`,
      exp: Math.floor(Date.now() / 1000) + 3600,
      video: { room: roomName, roomJoin: true, canPublish, canSubscribe: true, canPublishData: true },
    };
    return Buffer.from(JSON.stringify(payload)).toString('base64');
  }
}

// ─── Router Factory ────────────────────────
export function callsRouter(redis: RedisClient, kafka: KafkaProducer): Router {
  const router = Router();
  const repo = new CallRepository();

  // ── Start a call ──
  router.post('/start', authMiddleware(), async (req, res, next) => {
    try {
      const userId = req.user!.sub;
      const { chatId, type, isGroup } = req.body as { chatId: ChatId; type: CallType; isGroup?: boolean };

      // Check for existing active call
      const existing = await repo.getActiveCallInChat(chatId);
      if (existing) {
        // Join existing call instead
        return res.json({ success: true, data: { call: existing, action: 'join_existing' } });
      }

      const callId = crypto.randomUUID() as CallId;
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

      await kafka.send(EventTopic.CALL_EVENTS, {
        id: crypto.randomUUID(),
        type: EventType.CALL_STARTED,
        topic: EventTopic.CALL_EVENTS,
        timestamp: new Date().toISOString(),
        source: 'calls-service',
        correlationId: req.headers['x-correlation-id'] as string || crypto.randomUUID(),
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
      const call = await repo.getCall(callId);
      if (!call || (call.status !== CallStatus.RINGING && call.status !== CallStatus.ACTIVE)) {
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

      await kafka.send(EventTopic.CALL_EVENTS, {
        id: crypto.randomUUID(),
        type: EventType.CALL_PARTICIPANT_JOINED,
        topic: EventTopic.CALL_EVENTS,
        timestamp: new Date().toISOString(),
        source: 'calls-service',
        correlationId: crypto.randomUUID(),
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
      const call = await repo.getCall(callId);
      if (!call) throw new AppError('Call not found', 404);

      await repo.removeParticipant(callId, userId);

      const remaining = await repo.getActiveParticipantCount(callId);
      if (remaining === 0 || (!call.isGroup && remaining <= 1)) {
        await repo.updateCallStatus(callId, CallStatus.ENDED);
        await kafka.send(EventTopic.CALL_EVENTS, {
          id: crypto.randomUUID(),
          type: EventType.CALL_ENDED,
          topic: EventTopic.CALL_EVENTS,
          timestamp: new Date().toISOString(),
          source: 'calls-service',
          correlationId: crypto.randomUUID(),
          userId,
          payload: { callId, chatId: call.chatId, duration: call.duration },
        });
      } else {
        await kafka.send(EventTopic.CALL_EVENTS, {
          id: crypto.randomUUID(),
          type: EventType.CALL_PARTICIPANT_LEFT,
          topic: EventTopic.CALL_EVENTS,
          timestamp: new Date().toISOString(),
          source: 'calls-service',
          correlationId: crypto.randomUUID(),
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
      const call = await repo.getCall(callId);
      if (!call || call.status !== CallStatus.RINGING) throw new AppError('Call not found', 404);

      const remaining = await repo.getActiveParticipantCount(callId);
      if (!call.isGroup || remaining <= 1) {
        await repo.updateCallStatus(callId, CallStatus.DECLINED);
      }

      res.json({ success: true });
    } catch (err) { next(err); }
  });

  // ── Get call info ──
  router.get('/:callId', authMiddleware(), async (req, res, next) => {
    try {
      const call = await repo.getCall(req.params.callId as CallId);
      if (!call) throw new AppError('Call not found', 404);
      res.json({ success: true, data: call });
    } catch (err) { next(err); }
  });

  // ── Call history ──
  router.get('/history', authMiddleware(), async (req, res, next) => {
    try {
      const calls = await repo.getUserCallHistory(req.user!.sub, parseInt(req.query.limit as string) || 50);
      res.json({ success: true, data: calls });
    } catch (err) { next(err); }
  });

  // ── Active call in chat ──
  router.get('/chat/:chatId/active', authMiddleware(), async (req, res, next) => {
    try {
      const call = await repo.getActiveCallInChat(req.params.chatId as ChatId);
      res.json({ success: true, data: call });
    } catch (err) { next(err); }
  });

  // ── Toggle mute/video/screenshare (signaling via Redis pub/sub) ──
  router.post('/:callId/toggle', authMiddleware(), async (req, res, next) => {
    try {
      const { type } = req.body as { type: 'mute' | 'video' | 'screen' };
      const callId = req.params.callId;
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
