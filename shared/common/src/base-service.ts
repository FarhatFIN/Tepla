import express, { Express, Router } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { errorHandler } from './errors';
import { correlationMiddleware, requestLoggerMiddleware } from './middleware';
import { createLogger, Logger } from './logger';
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

export abstract class BaseService {
  protected app: Express;
  protected logger: Logger;
  protected kafka: KafkaProducer | null = null;
  protected redis: RedisClient | null = null;
  protected redisCache: RedisClient | null = null;     // volatile: allkeys-lru — presence, sparks balance, hot messages
  protected redisPersist: RedisClient | null = null;    // durable: sessions, ratchet keys, rate limits
  protected config: ServiceConfig;
  private startTime = Date.now();

  constructor(config: ServiceConfig) {
    this.config = config;
    this.app = express();
    this.logger = createLogger(config.name);
    this.setupMiddleware();
  }

  private setupMiddleware(): void {
    this.app.use(helmet());
    this.app.use(cors({
      origin: process.env.CORS_ORIGIN || '*',
      credentials: true,
    }));
    this.app.use(compression());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(correlationMiddleware());
    this.app.use(requestLoggerMiddleware(this.config.name));

    // Health endpoint
    this.app.get('/health', async (_req, res) => {
      const health = await this.getHealth();
      const statusCode = health.status === 'healthy' ? 200 : 503;
      res.status(statusCode).json(health);
    });

    this.app.get('/ready', async (_req, res) => {
      const health = await this.getHealth();
      if (health.status === 'unhealthy') {
        res.status(503).json({ ready: false });
      } else {
        res.status(200).json({ ready: true });
      }
    });
  }

  protected registerRoutes(prefix: string, router: Router): void {
    this.app.use(prefix, router);
  }

  protected async initInfrastructure(): Promise<void> {
    if (this.config.enableRedis !== false) {
      this.redis = new RedisClient();
      await this.redis.connect();

      // Split Redis: cache (volatile) + persist (durable)
      // Falls back to same instance if REDIS_CACHE_URL / REDIS_PERSIST_URL not set
      this.redisCache = new RedisClient('cache');
      this.redisPersist = new RedisClient('persist');
      await Promise.all([this.redisCache.connect(), this.redisPersist.connect()]);
      this.logger.info('Redis connected (default + cache + persist)');
    }

    if (this.config.enableKafka !== false) {
      this.kafka = new KafkaProducer(this.config.name);
      await this.kafka.connect();
      this.logger.info('Kafka producer connected');
    }
  }

  protected async getHealth(): Promise<HealthStatus> {
    const checks: HealthStatus['checks'] = {};

    if (this.redis) {
      try {
        const start = Date.now();
        await this.redis.set('health:ping', 'pong', 5);
        checks.redis = { status: 'ok', latency: Date.now() - start };
      } catch (e) {
        checks.redis = { status: 'error', message: (e as Error).message };
      }
    }

    if (this.kafka) {
      checks.kafka = { status: 'ok' }; // Producer connect check happens at init
    }

    const allOk = Object.values(checks).every((c) => c.status === 'ok');
    return {
      service: this.config.name,
      status: allOk ? 'healthy' : 'degraded',
      version: this.config.version || '2.0.0',
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      checks,
    };
  }

  abstract setup(): Promise<void>;

  async start(): Promise<void> {
    try {
      await this.initInfrastructure();
      await this.setup();

      // Error handler must be last
      this.app.use(errorHandler);

      this.app.listen(this.config.port, () => {
        this.logger.info(`${this.config.name} running on port ${this.config.port}`);
      });

      // Graceful shutdown
      const shutdown = async (signal: string) => {
        this.logger.info(`${signal} received, shutting down...`);
        if (this.kafka) await this.kafka.disconnect();
        await Promise.all([
          this.redis?.disconnect(),
          this.redisCache?.disconnect(),
          this.redisPersist?.disconnect(),
        ]);
        process.exit(0);
      };

      process.on('SIGTERM', () => shutdown('SIGTERM'));
      process.on('SIGINT', () => shutdown('SIGINT'));
    } catch (err) {
      this.logger.error('Failed to start service', { error: (err as Error).message });
      process.exit(1);
    }
  }
}
