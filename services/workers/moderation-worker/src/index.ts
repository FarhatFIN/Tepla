/**
 * Moderation Worker — Kafka consumer that auto-flags suspicious messages.
 *
 * Consumes: MESSAGE_EVENTS
 * Publishes: MODERATION_EVENTS (CONTENT_FLAGGED)
 *
 * Heuristics: repeated chars, excessive links, repeated long strings, banned words, excessive length.
 */

import { KafkaConsumer, KafkaProducer, createLogger } from '@tepla/common';
import { EventTopic, EventType, DomainEvent } from '@tepla/types';
import { v4 as uuid } from 'uuid';

const logger = createLogger('moderation-worker');

// Spam detection patterns
const SPAM_PATTERNS = [
  /(.)\1{10,}/,                    // repeated chars
  /(https?:\/\/\S+\s*){5,}/,      // excessive links
  /(.{20,})\1{3,}/,               // repeated long strings
];

const BANNED_WORDS: string[] = []; // Configure via env/DB

function analyzeContent(content: string): string[] {
  const flags: string[] = [];
  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(content)) flags.push('spam_pattern');
  }
  const lower = content.toLowerCase();
  for (const word of BANNED_WORDS) {
    if (lower.includes(word)) flags.push('banned_word');
  }
  if (content.length > 10000) flags.push('excessive_length');
  return [...new Set(flags)];
}

async function start(): Promise<void> {
  const kafka = new KafkaProducer('moderation-worker');
  await kafka.connect();

  const consumer = new KafkaConsumer('moderation-worker', 'moderation-group');
  await consumer.subscribe([EventTopic.MESSAGE_EVENTS]);

  consumer.on(EventType.MESSAGE_SENT, async (event: DomainEvent) => {
    const { content, senderId, chatId, messageId } = event.payload as any;
    if (!content) return;

    const flags = analyzeContent(content);
    if (flags.length > 0) {
      logger.warn('Content flagged', { messageId, senderId, flags });

      await kafka.publish({
        id: uuid(),
        type: EventType.CONTENT_FLAGGED,
        topic: EventTopic.MODERATION_EVENTS,
        timestamp: new Date().toISOString(),
        source: 'moderation-worker',
        correlationId: event.correlationId,
        payload: { messageId, senderId, chatId, flags },
      });
    }
  });

  await consumer.start();
  logger.info('Moderation worker started (consuming MESSAGE_EVENTS → auto-flagging)');

  const shutdown = async () => {
    logger.info('Shutting down moderation worker...');
    await consumer.disconnect();
    await kafka.disconnect();
    process.exit(0);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

start().catch(err => {
  logger.error('Moderation worker failed to start', { error: err.message });
  process.exit(1);
});
