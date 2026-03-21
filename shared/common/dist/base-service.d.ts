import { Express, Router } from 'express';
import { Logger } from './logger';
import { KafkaProducer } from './kafka';
import { RedisClient } from './redis';
import { HealthStatus } from '@tepla/types';
export interface ServiceConfig {
    name: string;
    port: number;
    version?: string;
    enableKafka?: boolean;
    enableRedis?: boolean;
}
export declare abstract class BaseService {
    protected app: Express;
    protected logger: Logger;
    protected kafka: KafkaProducer | null;
    protected redis: RedisClient | null;
    protected config: ServiceConfig;
    private startTime;
    constructor(config: ServiceConfig);
    private setupMiddleware;
    protected registerRoutes(prefix: string, router: Router): void;
    protected initInfrastructure(): Promise<void>;
    protected getHealth(): Promise<HealthStatus>;
    abstract setup(): Promise<void>;
    start(): Promise<void>;
}
//# sourceMappingURL=base-service.d.ts.map