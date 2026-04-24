import crypto from 'crypto';
import { RedisClient, createLogger, db } from '@tepla/common';

const logger = createLogger('risk-engine');

export interface RiskParams {
  userId?: string;
  deviceId?: string;
  fingerprint: string;
  ip: string;
}

export interface IPInfo {
  country: string;
  isVPN: boolean;
  isTor: boolean;
}

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type RequiredAuth = 'biometric' | 'otp' | 'number_challenge' | 'blocked';

export class RiskEngine {
  constructor(private redis: RedisClient) {}

  async calculateRiskScore(params: RiskParams): Promise<number> {
    let score = 0;
    try {
      if (params.userId && params.deviceId) {
        const device = await db.queryRow(
          `SELECT is_trusted, fingerprint, trust_expires_at FROM devices WHERE user_id = $1 AND device_id = $2`,
          [params.userId, params.deviceId]
        );
        if (device) {
          if (device.is_trusted && device.fingerprint === params.fingerprint &&
              (!device.trust_expires_at || new Date(device.trust_expires_at) > new Date())) {
            score += 0;
          } else if (device.fingerprint !== params.fingerprint) {
            score += 15;
          } else {
            score += 10;
          }
        } else {
          score += 20;
        }
      } else {
        score += 20;
      }

      const ipInfo = await this.getIPInfo(params.ip);

      if (params.userId) {
        const lastSession = await db.queryRow(
          `SELECT ip_address, country FROM sessions WHERE user_id = $1 AND is_active = true ORDER BY created_at DESC LIMIT 1`,
          [params.userId]
        );
        if (lastSession) {
          if (lastSession.ip_address !== params.ip) score += 15;
          if (lastSession.country && lastSession.country !== ipInfo.country) score += 25;
        }

        const countrySeen = await db.queryRow(
          `SELECT 1 FROM sessions WHERE user_id = $1 AND country = $2 LIMIT 1`,
          [params.userId, ipInfo.country]
        );
        if (!countrySeen && lastSession) score += 30;

        const attempts = await db.queryRow(
          `SELECT COUNT(*) as cnt FROM auth_audit WHERE user_id = $1 AND event LIKE '%login%' AND NOT success AND created_at > NOW() - INTERVAL '1 hour'`,
          [params.userId]
        );
        const cnt = parseInt(attempts?.cnt || '0');
        if (cnt >= 10) score += 40;
        else if (cnt >= 5) score += 20;
        else if (cnt >= 3) score += 15;
      }

      const blocked = await db.queryRow(
        `SELECT 1 FROM blocked_ips WHERE ip = $1 AND blocked_until > NOW()`, [params.ip]
      );
      if (blocked) score += 20;

      if (ipInfo.isVPN) score += 25;
      if (ipInfo.isTor) score += 35;

      const hour = new Date().getUTCHours();
      if (hour >= 2 && hour < 5) score += 10;

      return Math.min(score, 100);
    } catch (err) {
      logger.error('Risk score calculation failed', { error: err });
      return 50;
    }
  }

  getRiskLevel(score: number): RiskLevel {
    if (score <= 30) return 'low';
    if (score <= 60) return 'medium';
    if (score <= 80) return 'high';
    return 'critical';
  }

  getRequiredAuth(score: number): RequiredAuth {
    const level = this.getRiskLevel(score);
    switch (level) {
      case 'low': return 'biometric';
      case 'medium': return 'otp';
      case 'high': return 'number_challenge';
      case 'critical': return 'blocked';
    }
  }

  async getIPInfo(ip: string): Promise<IPInfo> {
    try {
      const cached = await this.redis.get(`ipinfo:${ip}`);
      if (cached) return JSON.parse(cached);

      const info: IPInfo = { country: 'Unknown', isVPN: false, isTor: false };
      try {
        const res = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,proxy,hosting`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'success') {
            info.country = data.country || 'Unknown';
            info.isVPN = data.proxy || data.hosting || false;
          }
        }
      } catch {}

      await this.redis.set(`ipinfo:${ip}`, JSON.stringify(info), 3600);
      return info;
    } catch {
      return { country: 'Unknown', isVPN: false, isTor: false };
    }
  }

  static generateFingerprint(headers: Record<string, string>): string {
    const ua = headers['user-agent'] || '';
    const lang = headers['accept-language'] || '';
    const ch = headers['sec-ch-ua'] || '';
    return crypto.createHash('sha256').update(`${ua}|${lang}|${ch}`).digest('hex');
  }
}
