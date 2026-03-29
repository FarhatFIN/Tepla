import { BaseService, createLogger } from '@tepla/common';
import { initializeSecurity } from '@tepla/security';
import { EventType, EventTopic, UserId } from '@tepla/types';
import { uuidv7 } from 'uuidv7';
import { messageRouter } from './routes/message.routes';
import { reactionRouter } from './routes/reaction.routes';
import { sparksRouter } from './routes/sparks.routes';
import { threadRouter } from './routes/thread.routes';
import { scheduledRouter } from './routes/scheduled.routes';
import { MessageRepository } from './repositories/message.repository';
import { OutboxWorker } from './services/outbox.worker';

const expiryLogger = createLogger('message-expiry');

class MessageService extends BaseService {
  constructor() {
    super({ name: 'message-service', port: 3004 });
  }

  async setup(): Promise<void> {
    // Initialize security framework (libsodium for E2E encryption)
    await initializeSecurity();

    this.registerRoutes('/api/messages', messageRouter(this.redis!, this.kafka!));
    this.registerRoutes('/api/reactions', reactionRouter(this.redis!, this.kafka!));
    this.registerRoutes('/api/sparks', sparksRouter(this.redis!, this.kafka!));
    this.registerRoutes('/api/threads', threadRouter(this.redis!, this.kafka!));
    this.registerRoutes('/api/scheduled', scheduledRouter(this.redis!, this.kafka!));

    // Disappearing messages — expiry worker (every 60s)
    this.startExpiryWorker();

    // Transactional outbox worker — polls unpublished events → Kafka
    const outboxWorker = new OutboxWorker(this.kafka!);
    outboxWorker.start();

    this.logger.info('Message service routes registered', {
      e2eEncryption: true,
      doubleRatchet: true,
      replayProtection: true,
      messagePipeline: true,
      threads: true,
      scheduledMessages: true,
      voiceMessages: true,
      disappearingMessages: true,
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
          // Group by chatId and emit deletion events
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
                source: 'message-service',
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

new MessageService().start();
