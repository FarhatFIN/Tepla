"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseService = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const errors_1 = require("./errors");
const middleware_1 = require("./middleware");
const logger_1 = require("./logger");
const kafka_1 = require("./kafka");
const redis_1 = require("./redis");
class BaseService {
    app;
    logger;
    kafka = null;
    redis = null;
    config;
    startTime = Date.now();
    constructor(config) {
        this.config = config;
        this.app = (0, express_1.default)();
        this.logger = (0, logger_1.createLogger)(config.name);
        this.setupMiddleware();
    }
    setupMiddleware() {
        this.app.use((0, helmet_1.default)());
        this.app.use((0, cors_1.default)({
            origin: process.env.CORS_ORIGIN || '*',
            credentials: true,
        }));
        this.app.use((0, compression_1.default)());
        this.app.use(express_1.default.json({ limit: '10mb' }));
        this.app.use(express_1.default.urlencoded({ extended: true }));
        this.app.use((0, middleware_1.correlationMiddleware)());
        this.app.use((0, middleware_1.requestLoggerMiddleware)(this.config.name));
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
            }
            else {
                res.status(200).json({ ready: true });
            }
        });
    }
    registerRoutes(prefix, router) {
        this.app.use(prefix, router);
    }
    async initInfrastructure() {
        if (this.config.enableRedis !== false) {
            this.redis = new redis_1.RedisClient();
            await this.redis.connect();
            this.logger.info('Redis connected');
        }
        if (this.config.enableKafka !== false) {
            this.kafka = new kafka_1.KafkaProducer(this.config.name);
            await this.kafka.connect();
            this.logger.info('Kafka producer connected');
        }
    }
    async getHealth() {
        const checks = {};
        if (this.redis) {
            try {
                const start = Date.now();
                await this.redis.set('health:ping', 'pong', 5);
                checks.redis = { status: 'ok', latency: Date.now() - start };
            }
            catch (e) {
                checks.redis = { status: 'error', message: e.message };
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
    async start() {
        try {
            await this.initInfrastructure();
            await this.setup();
            // Error handler must be last
            this.app.use(errors_1.errorHandler);
            this.app.listen(this.config.port, () => {
                this.logger.info(`${this.config.name} running on port ${this.config.port}`);
            });
            // Graceful shutdown
            const shutdown = async (signal) => {
                this.logger.info(`${signal} received, shutting down...`);
                if (this.kafka)
                    await this.kafka.disconnect();
                if (this.redis)
                    await this.redis.disconnect();
                process.exit(0);
            };
            process.on('SIGTERM', () => shutdown('SIGTERM'));
            process.on('SIGINT', () => shutdown('SIGINT'));
        }
        catch (err) {
            this.logger.error('Failed to start service', { error: err.message });
            process.exit(1);
        }
    }
}
exports.BaseService = BaseService;
//# sourceMappingURL=base-service.js.map