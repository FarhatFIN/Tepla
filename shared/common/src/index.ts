// ============================================
// Tepla Messenger — Common Service Utilities
// Base classes, middleware, config for all services
// ============================================

export { BaseService } from './base-service';
export { BaseRepository } from './base-repository';
export { KafkaProducer, KafkaConsumer } from './kafka';
export { RedisClient } from './redis';
export { createLogger, Logger } from './logger';
export { HttpClient } from './http-client';
export { ServiceRegistry } from './service-registry';
export { CircuitBreaker } from './circuit-breaker';
export { RateLimiter } from './rate-limiter';
export { errorHandler, AppError, NotFoundError, UnauthorizedError, ForbiddenError, ValidationError, ConflictError } from './errors';
export { authMiddleware, premiumMiddleware, correlationMiddleware, requestLoggerMiddleware, rateLimitMiddleware } from './middleware';
export { healthCheck } from './health';
export { gracefulShutdown } from './shutdown';
