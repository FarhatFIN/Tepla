/**
 * Kafka Dead Letter Queue (DLQ) + Poison Message Handler
 *
 * Wraps KafkaConsumer handlers with:
 * 1. Try/catch per message (never crash the consumer)
 * 2. Retry up to N times with backoff
 * 3. After N failures → publish to DLQ topic
 * 4. Alert on DLQ entries
 *
 * Production risk: infinite retry loop on persistent bad data.
 * Mitigation: max 3 retries, then skip + DLQ. DLQ has its own TTL (7 days).
 */

import { KafkaProducer, createLogger } from './index';
import { DomainEvent } from '@tepla/types';

const logger = createLogger('kafka-dlq');
const MAX_RETRIES = 3;
const RETRY_DELAYS = [100, 500, 2000]; // ms

export type SafeHandler = (event: DomainEvent) => Promise<void>;

/**
 * Wrap a Kafka event handler with DLQ protection.
 * Never throws — logs errors and publishes to DLQ on final failure.
 */
export function withDLQ(
  handler: SafeHandler,
  dlqProducer: KafkaProducer,
  dlqTopic: string = 'tepla-dlq'
): SafeHandler {
  return async (event: DomainEvent) => {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        await handler(event);
        return; // success
      } catch (err) {
        const error = err as Error;

        if (attempt < MAX_RETRIES) {
          logger.warn('Handler failed, retrying', {
            eventType: event.type,
            eventId: event.id,
            attempt: attempt + 1,
            error: error.message,
          });
          await sleep(RETRY_DELAYS[attempt] || 2000);
        } else {
          // Final failure — send to DLQ
          logger.error('Handler failed permanently, sending to DLQ', {
            eventType: event.type,
            eventId: event.id,
            error: error.message,
          });

          try {
            await dlqProducer.publish({
              ...event,
              topic: dlqTopic as any,
              type: `dlq.${event.type}` as any,
              payload: {
                originalEvent: event,
                error: error.message,
                stack: error.stack,
                failedAt: new Date().toISOString(),
                retries: MAX_RETRIES,
              },
            });
          } catch (dlqErr) {
            // If even DLQ fails, just log — don't crash the consumer
            logger.error('DLQ publish failed', {
              eventId: event.id,
              error: (dlqErr as Error).message,
            });
          }
        }
      }
    }
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}
