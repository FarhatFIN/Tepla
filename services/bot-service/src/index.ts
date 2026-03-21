// ============================================
// Tepla Messenger — Bot Service
// Bot API platform (Telegram-style)
// Port: 3013
// ============================================

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import crypto from 'crypto';
import {
  BaseRepository,
  KafkaProducer,
  KafkaConsumer,
  RedisClient,
  createLogger,
  authMiddleware,
  errorHandler,
  AppError,
} from '@tepla/common';
import {
  BotId,
  Bot,
  BotCommand,
  BotUpdate,
  BotKeyboard,
  UserId,
  ChatId,
  MessageId,
  EventTopic,
  EventType,
  ApiResponse,
} from '@tepla/types';

const logger = createLogger('bot-service');
const PORT = 3013;

// ─── Repository ────────────────────────────
class BotRepository extends BaseRepository {
  async create(bot: Bot): Promise<Bot> {
    await this.execute(
      `INSERT INTO bots (id, owner_id, username, display_name, avatar_url, description, about_text,
        webhook_url, webhook_secret, api_token, is_inline, is_public, commands, menu_button, is_enabled, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,NOW())`,
      [bot.id, bot.ownerId, bot.username, bot.displayName, bot.avatarUrl, bot.description,
       bot.aboutText, bot.webhookUrl, bot.webhookSecret, bot.apiToken, bot.isInline,
       bot.isPublic, JSON.stringify(bot.commands), JSON.stringify(bot.menuButton), bot.isEnabled]
    );
    return bot;
  }

  async findById(id: BotId): Promise<Bot | null> {
    const row = await this.queryOne<any>(`SELECT * FROM bots WHERE id = $1`, [id]);
    return row ? this.mapBot(row) : null;
  }

  async findByToken(token: string): Promise<Bot | null> {
    const row = await this.queryOne<any>(`SELECT * FROM bots WHERE api_token = $1`, [token]);
    return row ? this.mapBot(row) : null;
  }

  async findByUsername(username: string): Promise<Bot | null> {
    const row = await this.queryOne<any>(`SELECT * FROM bots WHERE username = $1`, [username]);
    return row ? this.mapBot(row) : null;
  }

  async findByOwner(ownerId: UserId): Promise<Bot[]> {
    const rows = await this.queryMany<any>(`SELECT * FROM bots WHERE owner_id = $1 ORDER BY created_at DESC`, [ownerId]);
    return rows.map(r => this.mapBot(r));
  }

  async update(id: BotId, fields: Partial<Bot>): Promise<void> {
    const sets: string[] = [];
    const vals: any[] = [];
    let i = 1;
    if (fields.displayName !== undefined) { sets.push(`display_name = $${i++}`); vals.push(fields.displayName); }
    if (fields.description !== undefined) { sets.push(`description = $${i++}`); vals.push(fields.description); }
    if (fields.aboutText !== undefined) { sets.push(`about_text = $${i++}`); vals.push(fields.aboutText); }
    if (fields.webhookUrl !== undefined) { sets.push(`webhook_url = $${i++}`); vals.push(fields.webhookUrl); }
    if (fields.commands !== undefined) { sets.push(`commands = $${i++}`); vals.push(JSON.stringify(fields.commands)); }
    if (fields.menuButton !== undefined) { sets.push(`menu_button = $${i++}`); vals.push(JSON.stringify(fields.menuButton)); }
    if (fields.isInline !== undefined) { sets.push(`is_inline = $${i++}`); vals.push(fields.isInline); }
    if (fields.isPublic !== undefined) { sets.push(`is_public = $${i++}`); vals.push(fields.isPublic); }
    if (fields.isEnabled !== undefined) { sets.push(`is_enabled = $${i++}`); vals.push(fields.isEnabled); }
    if (sets.length === 0) return;
    vals.push(id);
    await this.execute(`UPDATE bots SET ${sets.join(', ')} WHERE id = $${i}`, vals);
  }

  async delete(id: BotId): Promise<void> {
    await this.execute(`DELETE FROM bots WHERE id = $1`, [id]);
  }

  async getPublicBots(limit = 50, offset = 0): Promise<Bot[]> {
    const rows = await this.queryMany<any>(
      `SELECT * FROM bots WHERE is_public = true AND is_enabled = true ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return rows.map(r => this.mapBot(r));
  }

  private mapBot(row: any): Bot {
    return {
      id: row.id as BotId,
      ownerId: row.owner_id as UserId,
      username: row.username,
      displayName: row.display_name,
      avatarUrl: row.avatar_url,
      description: row.description,
      aboutText: row.about_text,
      webhookUrl: row.webhook_url,
      webhookSecret: row.webhook_secret,
      apiToken: row.api_token,
      isInline: row.is_inline,
      isPublic: row.is_public,
      commands: row.commands || [],
      menuButton: row.menu_button,
      isEnabled: row.is_enabled,
      createdAt: row.created_at,
    };
  }
}

// ─── Webhook Dispatcher ────────────────────
async function dispatchWebhook(bot: Bot, update: BotUpdate): Promise<void> {
  if (!bot.webhookUrl) return;
  try {
    const body = JSON.stringify(update);
    const signature = crypto.createHmac('sha256', bot.webhookSecret || '').update(body).digest('hex');
    await fetch(bot.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tepla-Bot-Signature': signature,
      },
      body,
      signal: AbortSignal.timeout(10000),
    });
  } catch (err: any) {
    logger.error('Webhook dispatch failed', { botId: bot.id, error: err.message });
  }
}

// ─── Service ───────────────────────────────
class BotService {
  private app = express();
  private repo!: BotRepository;
  private kafka!: KafkaProducer;
  private consumer!: KafkaConsumer;
  private redis!: RedisClient;

  async start() {
    this.redis = new RedisClient();
    this.kafka = new KafkaProducer('bot-service');
    this.consumer = new KafkaConsumer('bot-service', 'bot-service-group');
    this.repo = new BotRepository();

    await Promise.all([this.redis.connect(), this.kafka.connect()]);

    // Listen for messages to route to bots
    this.consumer.on(EventType.MESSAGE_SENT, async (event) => {
      const { message, chatId } = event.payload as any;
      if (!message?.content) return;

      // Check if message starts with /command
      if (message.content.startsWith('/')) {
        const [command, ...args] = message.content.split(' ');
        const botUsername = command.includes('@') ? command.split('@')[1] : null;

        // Find bot in chat or by username
        if (botUsername) {
          const bot = await this.repo.findByUsername(botUsername);
          if (bot && bot.isEnabled) {
            const update: BotUpdate = {
              updateId: crypto.randomUUID(),
              type: 'command',
              chatId,
              userId: event.userId!,
              messageId: message.id,
              data: command.split('@')[0],
              message,
            };
            await dispatchWebhook(bot, update);
            // Store in update queue for long-polling bots
            await this.redis.lpush(`bot:${bot.id}:updates`, JSON.stringify(update));
            await this.redis.ltrim(`bot:${bot.id}:updates`, 0, 999);
          }
        }
      }
    });

    await this.consumer.subscribe([EventTopic.MESSAGE_EVENTS]);
    await this.consumer.start();

    this.app.use(helmet());
    this.app.use(cors());
    this.app.use(express.json());

    this.app.get('/health', (_, res) => res.json({ status: 'ok', service: 'bot-service' }));

    // ── Developer: Create bot ──
    this.app.post('/api/bots', authMiddleware(), async (req, res, next) => {
      try {
        const userId = req.user!.sub;
        const { username, displayName, description } = req.body;

        const existing = await this.repo.findByUsername(username);
        if (existing) throw new AppError('Bot username already taken', 409);

        const botId = crypto.randomUUID() as BotId;
        const apiToken = `bot_${botId}_${crypto.randomBytes(32).toString('hex')}`;
        const webhookSecret = crypto.randomBytes(32).toString('hex');

        const bot = await this.repo.create({
          id: botId,
          ownerId: userId,
          username,
          displayName: displayName || username,
          avatarUrl: null,
          description: description || null,
          aboutText: null,
          webhookUrl: null,
          webhookSecret,
          apiToken,
          isInline: false,
          isPublic: false,
          commands: [],
          menuButton: null,
          isEnabled: true,
          createdAt: new Date().toISOString(),
        });

        await this.kafka.send(EventTopic.BOT_EVENTS, {
          id: crypto.randomUUID(),
          type: EventType.BOT_CREATED,
          topic: EventTopic.BOT_EVENTS,
          timestamp: new Date().toISOString(),
          source: 'bot-service',
          correlationId: crypto.randomUUID(),
          userId,
          payload: { botId: bot.id, username: bot.username },
        });

        res.status(201).json({ success: true, data: bot });
      } catch (err) { next(err); }
    });

    // ── Developer: List my bots ──
    this.app.get('/api/bots/my', authMiddleware(), async (req, res, next) => {
      try {
        const bots = await this.repo.findByOwner(req.user!.sub);
        res.json({ success: true, data: bots });
      } catch (err) { next(err); }
    });

    // ── Developer: Update bot ──
    this.app.patch('/api/bots/:botId', authMiddleware(), async (req, res, next) => {
      try {
        const bot = await this.repo.findById(req.params.botId as BotId);
        if (!bot || bot.ownerId !== req.user!.sub) throw new AppError('Not found', 404);
        await this.repo.update(bot.id, req.body);
        const updated = await this.repo.findById(bot.id);
        res.json({ success: true, data: updated });
      } catch (err) { next(err); }
    });

    // ── Developer: Set webhook ──
    this.app.post('/api/bots/:botId/webhook', authMiddleware(), async (req, res, next) => {
      try {
        const bot = await this.repo.findById(req.params.botId as BotId);
        if (!bot || bot.ownerId !== req.user!.sub) throw new AppError('Not found', 404);
        await this.repo.update(bot.id, { webhookUrl: req.body.url } as any);
        res.json({ success: true });
      } catch (err) { next(err); }
    });

    // ── Developer: Set commands ──
    this.app.post('/api/bots/:botId/commands', authMiddleware(), async (req, res, next) => {
      try {
        const bot = await this.repo.findById(req.params.botId as BotId);
        if (!bot || bot.ownerId !== req.user!.sub) throw new AppError('Not found', 404);
        const { commands } = req.body as { commands: BotCommand[] };
        await this.repo.update(bot.id, { commands });
        res.json({ success: true });
      } catch (err) { next(err); }
    });

    // ── Developer: Regenerate token ──
    this.app.post('/api/bots/:botId/regenerate-token', authMiddleware(), async (req, res, next) => {
      try {
        const bot = await this.repo.findById(req.params.botId as BotId);
        if (!bot || bot.ownerId !== req.user!.sub) throw new AppError('Not found', 404);
        const newToken = `bot_${bot.id}_${crypto.randomBytes(32).toString('hex')}`;
        await this.repo.update(bot.id, { apiToken: newToken } as any);
        res.json({ success: true, data: { apiToken: newToken } });
      } catch (err) { next(err); }
    });

    // ── Developer: Delete bot ──
    this.app.delete('/api/bots/:botId', authMiddleware(), async (req, res, next) => {
      try {
        const bot = await this.repo.findById(req.params.botId as BotId);
        if (!bot || bot.ownerId !== req.user!.sub) throw new AppError('Not found', 404);
        await this.repo.delete(bot.id);
        res.json({ success: true });
      } catch (err) { next(err); }
    });

    // ── Public: Browse bots ──
    this.app.get('/api/bots/public', async (req, res, next) => {
      try {
        const limit = parseInt(req.query.limit as string) || 50;
        const offset = parseInt(req.query.offset as string) || 0;
        const bots = await this.repo.getPublicBots(limit, offset);
        // Hide sensitive fields
        const safeBots = bots.map(b => ({ ...b, apiToken: undefined, webhookSecret: undefined, webhookUrl: undefined }));
        res.json({ success: true, data: safeBots });
      } catch (err) { next(err); }
    });

    // ── Bot API: Get updates (long-polling) ──
    this.app.get('/api/bot-api/getUpdates', async (req, res, next) => {
      try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) throw new AppError('Unauthorized', 401);
        const bot = await this.repo.findByToken(token);
        if (!bot) throw new AppError('Invalid token', 401);

        const timeout = Math.min(parseInt(req.query.timeout as string) || 30, 60);
        const limit = Math.min(parseInt(req.query.limit as string) || 100, 100);

        // Try to get updates immediately
        let updates: string[] = [];
        const endTime = Date.now() + timeout * 1000;

        while (Date.now() < endTime) {
          updates = await this.redis.lrange(`bot:${bot.id}:updates`, 0, limit - 1);
          if (updates.length > 0) {
            await this.redis.ltrim(`bot:${bot.id}:updates`, updates.length, -1);
            break;
          }
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        res.json({ success: true, data: updates.map(u => JSON.parse(u)) });
      } catch (err) { next(err); }
    });

    // ── Bot API: Send message ──
    this.app.post('/api/bot-api/sendMessage', async (req, res, next) => {
      try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) throw new AppError('Unauthorized', 401);
        const bot = await this.repo.findByToken(token);
        if (!bot) throw new AppError('Invalid token', 401);

        const { chatId, text, keyboard, replyToMessageId, silent } = req.body;

        // Publish message via Kafka for message-service to handle
        await this.kafka.send(EventTopic.MESSAGE_EVENTS, {
          id: crypto.randomUUID(),
          type: EventType.MESSAGE_SENT,
          topic: EventTopic.MESSAGE_EVENTS,
          timestamp: new Date().toISOString(),
          source: 'bot-service',
          correlationId: crypto.randomUUID(),
          userId: bot.id as any,
          payload: {
            chatId,
            content: text,
            type: 'text',
            keyboard,
            replyToMessageId,
            isSilent: silent || false,
            isBot: true,
            botId: bot.id,
          },
        });

        res.json({ success: true });
      } catch (err) { next(err); }
    });

    // ── Bot API: Answer callback query ──
    this.app.post('/api/bot-api/answerCallbackQuery', async (req, res, next) => {
      try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) throw new AppError('Unauthorized', 401);
        const bot = await this.repo.findByToken(token);
        if (!bot) throw new AppError('Invalid token', 401);

        const { callbackQueryId, text, showAlert } = req.body;
        // Route answer back via Redis pub/sub
        await this.redis.publish(`bot:callback:${callbackQueryId}`, JSON.stringify({ text, showAlert }));
        res.json({ success: true });
      } catch (err) { next(err); }
    });

    this.app.use(errorHandler);
    this.app.listen(PORT, () => logger.info(`Bot service running on port ${PORT}`));
  }
}

new BotService().start().catch(err => {
  logger.error('Failed to start service', { error: err.message });
  process.exit(1);
});
