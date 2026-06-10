import jwt from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';
import { UserId, AuthTokens } from '@tepla/types';
import { RedisClient } from '@tepla/common';

interface TokenInput {
  sub: UserId;
  username: string;
}

export class TokenService {
  private readonly jwtSecret: string;
  private readonly accessTtl: number;
  private readonly refreshTtl: number;

  constructor(private redis: RedisClient) {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('FATAL: JWT_SECRET environment variable is required in production');
      }
      // eslint-disable-next-line no-console
      console.warn('[token.service] JWT_SECRET is not set - using insecure development-only fallback');
    }
    this.jwtSecret = secret || 'tepla-jwt-secret-change-me';
    this.accessTtl = parseInt(process.env.JWT_ACCESS_TTL || '900'); // 15 min
    this.refreshTtl = parseInt(process.env.JWT_REFRESH_TTL || '2592000'); // 30 days
  }

  generateTokens(input: TokenInput): AuthTokens {
    const jti = uuid();
    const accessToken = jwt.sign(
      {
        sub: input.sub,
        username: input.username,
        jti,
      },
      this.jwtSecret,
      { expiresIn: this.accessTtl }
    );

    const refreshToken = jwt.sign(
      { sub: input.sub, jti: uuid(), type: 'refresh' },
      this.jwtSecret,
      { expiresIn: this.refreshTtl }
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: this.accessTtl,
    };
  }

  verifyAccessToken(token: string): any {
    const payload = jwt.verify(token, this.jwtSecret) as any;
    // SECURITY: a refresh token must never be accepted where an access token is expected.
    if (payload && typeof payload === 'object' && payload.type === 'refresh') {
      throw new jwt.JsonWebTokenError('Refresh token cannot be used as access token');
    }
    return payload;
  }

  verifyRefreshToken(token: string): any {
    const payload = jwt.verify(token, this.jwtSecret) as any;
    if (!payload || typeof payload !== 'object' || payload.type !== 'refresh') {
      throw new jwt.JsonWebTokenError('Invalid refresh token');
    }
    return payload;
  }

  async revokeToken(jti: string): Promise<void> {
    await this.redis.set(`revoked:${jti}`, '1', this.accessTtl);
  }

  async isRevoked(jti: string): Promise<boolean> {
    return this.redis.exists(`revoked:${jti}`);
  }
}
