// ============================================
// Tepla Messenger — Common Service Utilities
// Base classes, middleware, config for all services
// ============================================

export { BaseService } from './base-service';
export { BaseWorker } from './base-worker';
export { BaseRepository } from './base-repository';
export { requestContext, getContext, getCorrelationId, type RequestContext } from './context';
export { CacheLayer } from './cache';
export { DataLoader, type BatchFn } from './dataloader';
export { KafkaProducer, KafkaConsumer } from './kafka';
export { RedisClient, RedisRole } from './redis';
export { db } from './db';
export { createLogger, Logger } from './logger';
export { HttpClient, HttpError } from './http-client';
export { ServiceRegistry } from './service-registry';
export { CircuitBreaker } from './circuit-breaker';
export { RateLimiter } from './rate-limiter';
export { errorHandler, AppError, NotFoundError, UnauthorizedError, ForbiddenError, ValidationError, ConflictError } from './errors';
export { authMiddleware, correlationMiddleware, requestLoggerMiddleware, rateLimitMiddleware } from './middleware';
export { healthCheck } from './health';
export { gracefulShutdown } from './shutdown';
export { slidingWindowLimiter, RATE_LIMITS, type RateLimitConfig } from './sliding-window-limiter';
export { withDLQ } from './kafka-dlq';
export { checkSpam, type SpamCheckResult, type SpamCheckContext } from './spam-detection';
