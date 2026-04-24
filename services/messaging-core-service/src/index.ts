import { BaseService, createLogger } from '@tepla/common';
import { initializeSecurity } from '@tepla/security';
import { EventType, EventTopic } from '@tepla/types';
import { uuidv7 } from 'uuidv7';
import { Client as ElasticClient } from '@elastic/elasticsearch';

// Message modules
import { messageRouter } from './modules/messages/routes/message.routes';
import { reactionRouter } from './modules/reactions/routes/reaction.routes';
import { sparksRouter } from './modules/sparks/routes/sparks.routes';
import { threadRouter } from './modules/threads/routes/thread.routes';
import { scheduledRouter } from './modules/scheduled/routes/scheduled.routes';
import { MessageRepository } from './modules/messages/repositories/message.repository';
import { OutboxWorker } from './modules/messages/services/outbox.worker';

// Chat modules
import { chatRouter } from './modules/chats/routes/chat.routes';
import { advancedRouter } from './modules/chats/routes/advanced.routes';
import { folderRouter } from './modules/folders/routes/folder.routes';
import { rolesRouter } from './modules/roles/routes/roles.routes';

// Search — HTTP query endpoint only (indexer is a separate Kafka worker)
import { searchRouter, ensureSearchIndices } from './modules/search/search.module';

// Moderation — HTTP report endpoint only (auto-flagging is a separate Kafka worker)
import { moderationRouter } from './modules/moderation/moderation.module';

// Translation
import { translationRouter } from './modules/translation/translation.module';

const expiryLogger = createLogger('message-expiry');

class MessagingCoreService extends BaseService {
  constructor() {
    super({ name: 'messaging-core-service', port: 3004 });
  }

  async setup(): Promise<void> {
    await initializeSecurity();

    // ─── Messages ───────────────────────────────
    this.registerRoutes('/api/messages', messageRouter(this.redis!, this.kafka!));
    this.registerRoutes('/api/reactions', reactionRouter(this.redis!, this.kafka!));
    this.registerRoutes('/api/sparks', sparksRouter(this.redis!, this.kafka!));
    this.registerRoutes('/api/threads', threadRouter(this.redis!, this.kafka!));
    this.registerRoutes('/api/scheduled', scheduledRouter(this.redis!, this.kafka!));

    // ─── Chats ──────────────────────────────────
    this.registerRoutes('/api/chats', chatRouter(this.redis!, this.kafka!));
    this.registerRoutes('/api/chats', advancedRouter(this.redis!, this.kafka!));
    this.registerRoutes('/api/folders', folderRouter(this.redis!, this.kafka!));
    this.registerRoutes('/api/roles', rolesRouter(this.redis!, this.kafka!));

    // ─── Search (HTTP read path only) ───────────
    // Indexing happens in search-worker via Kafka consumer
    const elastic = new ElasticClient({
      node: process.env.ELASTICSEARCH_URL || 'http://elasticsearch:9200',
    });
    await ensureSearchIndices(elastic);
    this.registerRoutes('/api/search', searchRouter(elastic));

    // ─── Moderation (HTTP report only) ──────────
    // Auto-flagging happens in moderation-worker via Kafka consumer
    this.registerRoutes('/api/moderation', moderationRouter(this.kafka!));

    // ─── Translation ────────────────────────────
    this.registerRoutes('/api/translate', translationRouter(this.redis!, this.kafka!));

    // ─── Outbox worker (publishes buffered events → Kafka) ──
    const outboxWorker = new OutboxWorker(this.kafka!);
    outboxWorker.start();

    // ─── Disappearing messages — expiry worker ──
    this.startExpiryWorker();

    this.logger.info('Messaging core service ready (HTTP only, no Kafka consumers)', {
      modules: ['messages', 'chats', 'reactions', 'threads', 'sparks', 'scheduled', 'folders', 'roles', 'search', 'moderation', 'translation'],
    });
  }

  private startExpiryWorker(): void {
    const msgRepo = new MessageRepository();
    const kafka = this.kafka!;

    setInterval(async () => {
      try {
        const expired = await msgRepo.deleteExpiredMessages();
        if (expired.length > 0) {
          expiryLogger.info(`Expired ${expired.length} messages`);
          const byChatId = new Map<string, string[]>();
          for (const row of expired) {
            if (!byChatId.has(row.chat_id)) byChatId.set(row.chat_id, []);
            byChatId.get(row.chat_id)!.push(row.id);
          }
          for (const [chatId, messageIds] of byChatId) {
            for (const messageId of messageIds) {
              await kafka.publish({
                id: uuidv7(),
                type: EventType.MESSAGE_DELETED,
                topic: EventTopic.MESSAGE_EVENTS,
                timestamp: new Date().toISOString(),
                source: 'messaging-core-service',
                correlationId: uuidv7(),
                payload: { chatId, messageId },
              });
            }
          }
        }
      } catch (err: any) {
        expiryLogger.error('Expiry worker error', { error: err.message });
      }
    }, 60_000);
  }
}

new MessagingCoreService().start();
