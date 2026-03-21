"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeviceSecurity = void 0;
const crypto_1 = __importDefault(require("crypto"));
const config_1 = require("./config");
const audit_logger_1 = require("./audit-logger");
/**
 * Device Security
 * Fingerprinting, device trust management, and anomaly detection
 */
class DeviceSecurity {
    redis;
    constructor(redis) {
        this.redis = redis;
    }
    /** Generate device fingerprint from HTTP headers */
    static fingerprint(headers, cookieId) {
        const components = [
            headers['user-agent'] || '',
            headers['accept-language'] || '',
            headers['sec-ch-ua'] || '',
            headers['sec-ch-ua-platform'] || '',
            headers['x-forwarded-for'] || '',
            cookieId || '',
        ].join('|');
        return crypto_1.default.createHash('sha256').update(components).digest('hex');
    }
    /** Register a device for a user */
    async registerDevice(userId, fingerprint, meta) {
        const key = `device:${userId}:${fingerprint}`;
        const existing = await this.redis.get(key);
        const device = existing
            ? { ...JSON.parse(existing), lastSeen: Date.now(), ip: meta.ip }
            : {
                fingerprint,
                userAgent: meta.userAgent,
                ip: meta.ip,
                firstSeen: Date.now(),
                lastSeen: Date.now(),
                trusted: false,
            };
        await this.redis.set(key, JSON.stringify(device), 'EX', config_1.SecurityConfig.DEVICE_TTL);
        await this.redis.sadd(`devices:${userId}`, fingerprint);
        await this.redis.expire(`devices:${userId}`, config_1.SecurityConfig.DEVICE_TTL);
        return device;
    }
    /** Check if a device is known for this user */
    async isKnownDevice(userId, fingerprint) {
        return await this.redis.sismember(`devices:${userId}`, fingerprint) === 1;
    }
    /** Get all devices for a user */
    async getUserDevices(userId) {
        const fingerprints = await this.redis.smembers(`devices:${userId}`);
        const devices = [];
        for (const fp of fingerprints) {
            const raw = await this.redis.get(`device:${userId}:${fp}`);
            if (raw) {
                devices.push(JSON.parse(raw));
            }
        }
        return devices;
    }
    /** Trust a device */
    async trustDevice(userId, fingerprint) {
        const key = `device:${userId}:${fingerprint}`;
        const raw = await this.redis.get(key);
        if (raw) {
            const device = JSON.parse(raw);
            device.trusted = true;
            await this.redis.set(key, JSON.stringify(device), 'EX', config_1.SecurityConfig.DEVICE_TTL);
        }
    }
    /** Revoke a device */
    async revokeDevice(userId, fingerprint) {
        await this.redis.del(`device:${userId}:${fingerprint}`);
        await this.redis.srem(`devices:${userId}`, fingerprint);
        await audit_logger_1.AuditLogger.log('device_revoked', { userId, fingerprint: fingerprint.substring(0, 8) });
    }
    /** Revoke all devices for a user */
    async revokeAllDevices(userId) {
        const fingerprints = await this.redis.smembers(`devices:${userId}`);
        for (const fp of fingerprints) {
            await this.redis.del(`device:${userId}:${fp}`);
        }
        await this.redis.del(`devices:${userId}`);
        await audit_logger_1.AuditLogger.log('devices_revoked_all', { userId, count: fingerprints.length });
    }
    /** Detect suspicious login (new device + new IP) */
    async detectAnomaly(userId, fingerprint, ip) {
        const isKnown = await this.isKnownDevice(userId, fingerprint);
        if (!isKnown) {
            // Check if IP is also new
            const devices = await this.getUserDevices(userId);
            const knownIPs = new Set(devices.map((d) => d.ip));
            if (devices.length > 0 && !knownIPs.has(ip)) {
                await audit_logger_1.AuditLogger.log('anomaly_detected', {
                    userId,
                    fingerprint: fingerprint.substring(0, 8),
                    ip,
                    reason: 'new_device_new_ip',
                });
                return { suspicious: true, reason: 'New device from unknown location' };
            }
            if (!isKnown && devices.length > 0) {
                return { suspicious: true, reason: 'New device detected' };
            }
        }
        return { suspicious: false };
    }
}
exports.DeviceSecurity = DeviceSecurity;
//# sourceMappingURL=device-security.js.map