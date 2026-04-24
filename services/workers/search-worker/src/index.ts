/**
 * Search Worker — Kafka consumer that indexes messages/users/chats into Elasticsearch.
 *
 * Consumes: MESSAGE_EVENTS, USER_EVENTS, CHAT_EVENTS
 * Writes to: Elasticsearch (tepla-messages, tepla-users, tepla-chats)
 *
 * Bulk buffer: batches up to 100 docs or flushes every 500ms for throughput.
 */

import { KafkaConsumer, createLogger } from '@tepla/common';
import { EventTopic, EventType, DomainEvent } from '@tepla/types';
import { Client as ElasticClient } from '@elastic/elasticsearch';

const logger = createLogger('search-worker');

const elastic = new ElasticClient({
  node: process.env.ELASTICSEARCH_URL || 'http://elasticsearch:9200',
});

// ─── Ensure Indices ─────────────────────────────
async function ensureIndices(): Promise<void> {
  for (const index of ['tepla-messages', 'tepla-users', 'tepla-chats']) {
    const exists = await elastic.indices.exists({ index });
    if (!exists) {
      await elastic.indices.create({ index });
      logger.info(`Created index: ${index}`);
    }
  }
}

// ─── Bulk Buffer ────────────────────────────────
const bulkBuffer: Array<{ action: object; doc?: object }> = [];
const BULK_MAX_SIZE = 100;
const BULK_FLUSH_MS = 500;
let bulkTimer: NodeJS.Timeout | null = null;

async function flushBulk(): Promise<void> {
  if (bulkBuffer.length === 0) return;
  const ops = bulkBuffer.splice(0, bulkBuffer.length);
  const body = ops.flatMap(op => op.doc ? [op.action, op.doc] : [op.action]);
  try {
    const result = await elastic.bulk({ body });
    if (result.errors) {
      const errors = result.items.filter((i: any) => i.index?.error || i.delete?.error);
      logger.warn(`Bulk indexing: ${errors.length} errors in batch of ${ops.length}`);
    } else {
      logger.debug(`Indexed ${ops.length} documents`);
    }
  } catch (err) {
    logger.error('Bulk indexing failed', { error: (err as Error).message, count: ops.length });
  }
}

function enqueueBulk(action: object, doc?: object): void {
  bulkBuffer.push({ action, doc });
  if (bulkBuffer.length >= BULK_MAX_SIZE) {
    if (bulkTimer) { clearTimeout(bulkTimer); bulkTimer = null; }
    flushBulk();
  } else if (!bulkTimer) {
    bulkTimer = setTimeout(() => { bulkTimer = null; flushBulk(); }, BULK_FLUSH_MS);
  }
}

// ─── Start ──────────────────────────────────────
async function start(): Promise<void> {
  await ensureIndices();

  const consumer = new KafkaConsumer('search-worker', 'search-index-group');
  await consumer.subscribe([EventTopic.MESSAGE_EVENTS, EventTopic.USER_EVENTS, EventTopic.CHAT_EVENTS]);

  consumer.on(EventType.MESSAGE_SENT, async (event: DomainEvent) => {
    const msg = event.payload as any;
    enqueueBulk(
      { index: { _index: 'tepla-messages', _id: msg.messageId } },
      { messageId: msg.messageId, chatId: msg.chatId, senderId: msg.senderId, content: msg.content, type: msg.type, createdAt: msg.createdAt },
    );
  });

  consumer.on(EventType.MESSAGE_EDITED, async (event: DomainEvent) => {
    const { messageId, content } = event.payload as any;
    if (messageId && content) {
      enqueueBulk(
        { update: { _index: 'tepla-messages', _id: messageId } },
        { doc: { content } } as any,
      );
    }
  });

  consumer.on(EventType.MESSAGE_DELETED, async (event: DomainEvent) => {
    const { messageId } = event.payload as any;
    enqueueBulk({ delete: { _index: 'tepla-messages', _id: messageId } });
  });

  consumer.on(EventType.USER_CREATED, async (event: DomainEvent) => {
    const user = event.payload as any;
    if (user.userId) {
      enqueueBulk(
        { index: { _index: 'tepla-users', _id: user.userId } },
        { userId: user.userId, username: user.username, displayName: user.displayName, bio: user.bio },
      );
    }
  });

  consumer.on(EventType.USER_UPDATED, async (event: DomainEvent) => {
    const { userId, fields } = event.payload as any;
    if (userId && fields) {
      enqueueBulk(
        { update: { _index: 'tepla-users', _id: userId } },
        { doc: fields } as any,
      );
    }
  });

  await consumer.start();
  logger.info('Search worker started (consuming MESSAGE_EVENTS, USER_EVENTS, CHAT_EVENTS → Elasticsearch)');

  // Graceful shutdown: flush remaining buffer
  const shutdown = async () => {
    logger.info('Shutting down search worker...');
    await flushBulk();
    await consumer.disconnect();
    process.exit(0);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

start().catch(err => {
  logger.error('Search worker failed to start', { error: err.message });
  process.exit(1);
});
