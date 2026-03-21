"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KafkaConsumer = exports.KafkaProducer = void 0;
const kafkajs_1 = require("kafkajs");
const logger_1 = require("./logger");
const logger = (0, logger_1.createLogger)('kafka');
function createKafkaInstance(clientId) {
    return new kafkajs_1.Kafka({
        clientId,
        brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
        logLevel: kafkajs_1.logLevel.WARN,
        retry: { retries: 5, initialRetryTime: 300 },
    });
}
// ─── Producer ───────────────────────────────
class KafkaProducer {
    producer;
    connected = false;
    constructor(clientId) {
        const kafka = createKafkaInstance(clientId);
        this.producer = kafka.producer({
            allowAutoTopicCreation: true,
            idempotent: true,
        });
    }
    async connect() {
        if (this.connected)
            return;
        await this.producer.connect();
        this.connected = true;
        logger.info('Kafka producer connected');
    }
    async publish(event) {
        if (!this.connected)
            await this.connect();
        await this.producer.send({
            topic: event.topic,
            messages: [
                {
                    key: event.userId || event.id,
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
    async publishBatch(events) {
        if (!this.connected)
            await this.connect();
        const topicMessages = new Map();
        for (const event of events) {
            if (!topicMessages.has(event.topic)) {
                topicMessages.set(event.topic, []);
            }
            topicMessages.get(event.topic).push({
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
    async disconnect() {
        await this.producer.disconnect();
        this.connected = false;
    }
}
exports.KafkaProducer = KafkaProducer;
class KafkaConsumer {
    consumer;
    handlers = new Map();
    connected = false;
    constructor(clientId, groupId) {
        const kafka = createKafkaInstance(clientId);
        this.consumer = kafka.consumer({
            groupId,
            sessionTimeout: 30000,
            heartbeatInterval: 3000,
        });
    }
    on(eventType, handler) {
        if (!this.handlers.has(eventType)) {
            this.handlers.set(eventType, []);
        }
        this.handlers.get(eventType).push(handler);
    }
    async subscribe(topics) {
        if (!this.connected) {
            await this.consumer.connect();
            this.connected = true;
        }
        for (const topic of topics) {
            await this.consumer.subscribe({ topic, fromBeginning: false });
        }
        logger.info('Kafka consumer subscribed', { topics });
    }
    async start() {
        await this.consumer.run({
            eachMessage: async ({ message }) => {
                try {
                    const event = JSON.parse(message.value.toString());
                    const handlers = this.handlers.get(event.type) || [];
                    const wildcardHandlers = this.handlers.get('*') || [];
                    await Promise.all([
                        ...handlers.map((h) => h(event)),
                        ...wildcardHandlers.map((h) => h(event)),
                    ]);
                }
                catch (err) {
                    logger.error('Error processing Kafka message', {
                        error: err.message,
                        offset: message.offset,
                    });
                }
            },
        });
        logger.info('Kafka consumer started');
    }
    async disconnect() {
        await this.consumer.disconnect();
        this.connected = false;
    }
}
exports.KafkaConsumer = KafkaConsumer;
//# sourceMappingURL=kafka.js.map