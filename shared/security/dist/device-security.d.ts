import Redis from 'ioredis';
export interface DeviceInfo {
    fingerprint: string;
    userAgent: string;
    ip: string;
    firstSeen: number;
    lastSeen: number;
    trusted: boolean;
}
/**
 * Device Security
 * Fingerprinting, device trust management, and anomaly detection
 */
export declare class DeviceSecurity {
    private redis;
    constructor(redis: Redis);
    /** Generate device fingerprint from HTTP headers */
    static fingerprint(headers: Record<string, string | undefined>, cookieId?: string): string;
    /** Register a device for a user */
    registerDevice(userId: string, fingerprint: string, meta: {
        userAgent: string;
        ip: string;
    }): Promise<DeviceInfo>;
    /** Check if a device is known for this user */
    isKnownDevice(userId: string, fingerprint: string): Promise<boolean>;
    /** Get all devices for a user */
    getUserDevices(userId: string): Promise<DeviceInfo[]>;
    /** Trust a device */
    trustDevice(userId: string, fingerprint: string): Promise<void>;
    /** Revoke a device */
    revokeDevice(userId: string, fingerprint: string): Promise<void>;
    /** Revoke all devices for a user */
    revokeAllDevices(userId: string): Promise<void>;
    /** Detect suspicious login (new device + new IP) */
    detectAnomaly(userId: string, fingerprint: string, ip: string): Promise<{
        suspicious: boolean;
        reason?: string;
    }>;
}
//# sourceMappingURL=device-security.d.ts.map