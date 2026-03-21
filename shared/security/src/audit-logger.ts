import Redis from 'ioredis';
import { SecurityConfig } from './config';

/**
 * Security Audit Logger
 * All security events are logged to a Redis list for real-time monitoring.
 * Can be consumed by Analytics Service via Kafka for long-term storage.
 */

// Lazy-initialized Redis connection for audit logging
let auditRedis: Redis | null = null;

function getRedis(): Redis {
  if (!auditRedis) {
    auditRedis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });
    auditRedis.connect().catch(() => {});
  }
  return auditRedis;
}

export interface AuditEntry {
  event: string;
  data: Record<string, unknown>;
  timestamp: number;
  service?: string;
}

export class AuditLogger {

  /** Log a security event */
  static async log(event: string, data: Record<string, unknown> = {}): Promise<void> {
    try {
      const entry: AuditEntry = {
        event,
        data,
        timestamp: Date.now(),
        service: process.env.SERVICE_NAME || 'unknown',
      };

      const redis = getRedis();
      await redis.lpush('security_audit_log', JSON.stringify(entry));

      // Trim to max size
      await redis.ltrim('security_audit_log', 0, SecurityConfig.AUDIT_LOG_MAX_SIZE - 1);

      // Also log to stderr for container logging
      if (process.env.LOG_SECURITY_EVENTS !== 'false') {
        console.error(JSON.stringify({
          level: 'security',
          ...entry,
        }));
      }
    } catch {
      // Audit logging should never crash the service
      console.error(`[AUDIT FALLBACK] ${event}: ${JSON.stringify(data)}`);
    }
  }

  /** Get recent audit entries */
  static async getRecent(count: number = 100): Promise<AuditEntry[]> {
    try {
      const redis = getRedis();
      const entries = await redis.lrange('security_audit_log', 0, count - 1);
      return entries.map((e) => JSON.parse(e));
    } catch {
      return [];
    }
  }

  /** Search audit log by event type */
  static async search(eventType: string, count: number = 50): Promise<AuditEntry[]> {
    const all = await this.getRecent(SecurityConfig.AUDIT_LOG_MAX_SIZE);
    return all.filter((e) => e.event === eventType).slice(0, count);
  }

  /** Set custom Redis instance (for dependency injection in services) */
  static setRedis(redis: Redis): void {
    auditRedis = redis;
  }
}
