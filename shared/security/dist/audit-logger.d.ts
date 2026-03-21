import Redis from 'ioredis';
export interface AuditEntry {
    event: string;
    data: Record<string, unknown>;
    timestamp: number;
    service?: string;
}
export declare class AuditLogger {
    /** Log a security event */
    static log(event: string, data?: Record<string, unknown>): Promise<void>;
    /** Get recent audit entries */
    static getRecent(count?: number): Promise<AuditEntry[]>;
    /** Search audit log by event type */
    static search(eventType: string, count?: number): Promise<AuditEntry[]>;
    /** Set custom Redis instance (for dependency injection in services) */
    static setRedis(redis: Redis): void;
}
//# sourceMappingURL=audit-logger.d.ts.map