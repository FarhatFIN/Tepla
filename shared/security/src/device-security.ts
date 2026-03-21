import crypto from 'crypto';
import { SecurityConfig } from './config';
import { AuditLogger } from './audit-logger';
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
export class DeviceSecurity {
  private redis: Redis;

  constructor(redis: Redis) {
    this.redis = redis;
  }

  /** Generate device fingerprint from HTTP headers */
  static fingerprint(headers: Record<string, string | undefined>, cookieId?: string): string {
    const components = [
      headers['user-agent'] || '',
      headers['accept-language'] || '',
      headers['sec-ch-ua'] || '',
      headers['sec-ch-ua-platform'] || '',
      headers['x-forwarded-for'] || '',
      cookieId || '',
    ].join('|');

    return crypto.createHash('sha256').update(components).digest('hex');
  }

  /** Register a device for a user */
  async registerDevice(userId: string, fingerprint: string, meta: { userAgent: string; ip: string }): Promise<DeviceInfo> {
    const key = `device:${userId}:${fingerprint}`;
    const existing = await this.redis.get(key);

    const device: DeviceInfo = existing
      ? { ...JSON.parse(existing), lastSeen: Date.now(), ip: meta.ip }
      : {
          fingerprint,
          userAgent: meta.userAgent,
          ip: meta.ip,
          firstSeen: Date.now(),
          lastSeen: Date.now(),
          trusted: false,
        };

    await this.redis.set(key, JSON.stringify(device), 'EX', SecurityConfig.DEVICE_TTL);
    await this.redis.sadd(`devices:${userId}`, fingerprint);
    await this.redis.expire(`devices:${userId}`, SecurityConfig.DEVICE_TTL);

    return device;
  }

  /** Check if a device is known for this user */
  async isKnownDevice(userId: string, fingerprint: string): Promise<boolean> {
    return await this.redis.sismember(`devices:${userId}`, fingerprint) === 1;
  }

  /** Get all devices for a user */
  async getUserDevices(userId: string): Promise<DeviceInfo[]> {
    const fingerprints = await this.redis.smembers(`devices:${userId}`);
    const devices: DeviceInfo[] = [];

    for (const fp of fingerprints) {
      const raw = await this.redis.get(`device:${userId}:${fp}`);
      if (raw) {
        devices.push(JSON.parse(raw));
      }
    }

    return devices;
  }

  /** Trust a device */
  async trustDevice(userId: string, fingerprint: string): Promise<void> {
    const key = `device:${userId}:${fingerprint}`;
    const raw = await this.redis.get(key);
    if (raw) {
      const device = JSON.parse(raw);
      device.trusted = true;
      await this.redis.set(key, JSON.stringify(device), 'EX', SecurityConfig.DEVICE_TTL);
    }
  }

  /** Revoke a device */
  async revokeDevice(userId: string, fingerprint: string): Promise<void> {
    await this.redis.del(`device:${userId}:${fingerprint}`);
    await this.redis.srem(`devices:${userId}`, fingerprint);
    await AuditLogger.log('device_revoked', { userId, fingerprint: fingerprint.substring(0, 8) });
  }

  /** Revoke all devices for a user */
  async revokeAllDevices(userId: string): Promise<void> {
    const fingerprints = await this.redis.smembers(`devices:${userId}`);
    for (const fp of fingerprints) {
      await this.redis.del(`device:${userId}:${fp}`);
    }
    await this.redis.del(`devices:${userId}`);
    await AuditLogger.log('devices_revoked_all', { userId, count: fingerprints.length });
  }

  /** Detect suspicious login (new device + new IP) */
  async detectAnomaly(userId: string, fingerprint: string, ip: string): Promise<{ suspicious: boolean; reason?: string }> {
    const isKnown = await this.isKnownDevice(userId, fingerprint);

    if (!isKnown) {
      // Check if IP is also new
      const devices = await this.getUserDevices(userId);
      const knownIPs = new Set(devices.map((d) => d.ip));

      if (devices.length > 0 && !knownIPs.has(ip)) {
        await AuditLogger.log('anomaly_detected', {
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
