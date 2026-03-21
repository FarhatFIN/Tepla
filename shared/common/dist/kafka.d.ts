import { DomainEvent, EventTopic } from '@tepla/types';
export declare class KafkaProducer {
    private producer;
    private connected;
    constructor(clientId: string);
    connect(): Promise<void>;
    publish<T>(event: DomainEvent<T>): Promise<void>;
    publishBatch<T>(events: DomainEvent<T>[]): Promise<void>;
    disconnect(): Promise<void>;
}
export type EventHandler = (event: DomainEvent) => Promise<void>;
export declare class KafkaConsumer {
    private consumer;
    private handlers;
    private connected;
    constructor(clientId: string, groupId: string);
    on(eventType: string, handler: EventHandler): void;
    subscribe(topics: EventTopic[]): Promise<void>;
    start(): Promise<void>;
    disconnect(): Promise<void>;
}
//# sourceMappingURL=kafka.d.ts.map