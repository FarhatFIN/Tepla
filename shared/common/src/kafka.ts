import { Kafka, Producer, Consumer, EachMessagePayload, logLevel } from 'kafkajs';
import { DomainEvent, EventTopic } from '@tepla/types';
import { createLogger } from './logger';

const logger = createLogger('kafka');

function createKafkaInstance(clientId: string): Kafka {
  return new Kafka({
    clientId,
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    logLevel: logLevel.WARN,
    retry: { retries: 5, initialRetryTime: 300 },
  });
}

// ─── Producer ───────────────────────────────
export class KafkaProducer {
  private producer: Producer;
  private connected = false;

  constructor(clientId: string) {
    const kafka = createKafkaInstance(clientId);
    this.producer = kafka.producer({
      allowAutoTopicCreation: true,
      idempotent: true,
    });
  }

  async connect(): Promise<void> {
    if (this.connected) return;
    await this.producer.connect();
    this.connected = true;
    logger.info('Kafka producer connected');
  }

  async publish<T>(event: DomainEvent<T>): Promise<void> {
    if (!this.connected) await this.connect();
    // Use chatId as partition key for message events → per-chat ordering
    const payload = event.payload as any;
    const key = payload?.chatId || event.userId || event.id;
    await this.producer.send({
      topic: event.topic,
      messages: [
        {
          key,
          value: JSON.stringify(event),
          headers: {
            'event-type': event.type,
            'correlation-id': event.correlationId,
            'source': event.source,
          },
        },
      ],
    });
    logger.debug('Event published', { type: event.type, topic: event.topic });
  }

  async publishBatch<T>(events: DomainEvent<T>[]): Promise<void> {
    if (!this.connected) await this.connect();
    const topicMessages = new Map<string, Array<{ key: string; value: string; headers: Record<string, string> }>>();

    for (const event of events) {
      if (!topicMessages.has(event.topic)) {
        topicMessages.set(event.topic, []);
      }
      topicMessages.get(event.topic)!.push({
        key: event.userId || event.id,
        value: JSON.stringify(event),
        headers: {
          'event-type': event.type,
          'correlation-id': event.correlationId,
          'source': event.source,
        },
      });
    }

    await this.producer.sendBatch({
      topicMessages: Array.from(topicMessages.entries()).map(([topic, messages]) => ({
        topic,
        messages,
      })),
    });
  }

  async disconnect(): Promise<void> {
    await this.producer.disconnect();
    this.connected = false;
  }
}

// ─── Consumer ───────────────────────────────
export type EventHandler = (event: DomainEvent) => Promise<void>;

export class KafkaConsumer {
  private consumer: Consumer;
  private handlers = new Map<string, EventHandler[]>();
  private connected = false;

  constructor(clientId: string, groupId: string) {
    const kafka = createKafkaInstance(clientId);
    this.consumer = kafka.consumer({
      groupId,
      sessionTimeout: 30000,
      heartbeatInterval: 3000,
    });
  }

  on(eventType: string, handler: EventHandler): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);
  }

  async subscribe(topics: EventTopic[]): Promise<void> {
    if (!this.connected) {
      await this.consumer.connect();
      this.connected = true;
    }
    for (const topic of topics) {
      await this.consumer.subscribe({ topic, fromBeginning: false });
    }
    logger.info('Kafka consumer subscribed', { topics });
  }

  async start(): Promise<void> {
    await this.consumer.run({
      eachMessage: async ({ message }: EachMessagePayload) => {
        try {
          const event: DomainEvent = JSON.parse(message.value!.toString());
          const handlers = this.handlers.get(event.type) || [];
          const wildcardHandlers = this.handlers.get('*') || [];

          await Promise.all([
            ...handlers.map((h) => h(event)),
            ...wildcardHandlers.map((h) => h(event)),
          ]);
        } catch (err) {
          logger.error('Error processing Kafka message', {
            error: (err as Error).message,
            offset: message.offset,
          });
        }
      },
    });
    logger.info('Kafka consumer started');
  }

  async disconnect(): Promise<void> {
    await this.consumer.disconnect();
    this.connected = false;
  }
}
