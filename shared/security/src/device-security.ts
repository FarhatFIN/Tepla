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

  /**
   * Generate device fingerprint from HTTP headers.
   * IP is NOT included — it changes with networks and x-forwarded-for is spoofable.
   * Use getClientIp() separately for IP-based checks.
   */
  static fingerprint(headers: Record<string, string | undefined>, cookieId?: string): string {
    const components = [
      headers['user-agent'] || '',
      headers['accept-language'] || '',
      headers['sec-ch-ua'] || '',
      headers['sec-ch-ua-platform'] || '',
      cookieId || '',
    ].join('|');

    return crypto.createHash('sha256').update(components).digest('hex');
  }

  /**
   * Extract client IP safely.
   * Only trust x-forwarded-for from proxies in TRUSTED_PROXIES allowlist.
   * Otherwise use socket remoteAddress.
   */
  static getClientIp(req: { socket: { remoteAddress?: string }; headers: Record<string, string | undefined> }): string {
    const trustedProxies = (process.env.TRUSTED_PROXIES || '').split(',').filter(Boolean);
    const socketIp = req.socket.remoteAddress || '0.0.0.0';

    if (trustedProxies.length > 0 && trustedProxies.includes(socketIp)) {
      const forwarded = req.headers['x-forwarded-for'];
      if (forwarded) {
        // First IP in the chain is the original client
        return forwarded.split(',')[0].trim();
      }
    }

    return socketIp;
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

  /**
   * Get all devices for a user.
   *
   * M-09: this issued one round-trip per fingerprint. With ~20 devices that is
   * 20 sequential RTTs on a path that runs during login and on every anomaly
   * check. A pipeline collapses it to one.
   */
  async getUserDevices(userId: string): Promise<DeviceInfo[]> {
    const fingerprints = await this.redis.smembers(`devices:${userId}`);
    if (fingerprints.length === 0) return [];

    const pipeline = this.redis.pipeline();
    for (const fp of fingerprints) {
      pipeline.get(`device:${userId}:${fp}`);
    }
    const results = await pipeline.exec();
    if (!results) return [];

    const devices: DeviceInfo[] = [];
    const stale: string[] = [];

    results.forEach(([err, raw], index) => {
      if (err || typeof raw !== 'string') {
        // The per-device key expired but the set member outlived it.
        if (!err) stale.push(fingerprints[index]);
        return;
      }
      try {
        devices.push(JSON.parse(raw) as DeviceInfo);
      } catch {
        stale.push(fingerprints[index]);
      }
    });

    // Keep the index from growing forever with fingerprints whose payload is gone.
    if (stale.length > 0) {
      await this.redis.srem(`devices:${userId}`, ...stale).catch(() => undefined);
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
    if (fingerprints.length > 0) {
      await this.redis.del(...fingerprints.map((fp) => `device:${userId}:${fp}`));
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
