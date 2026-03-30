import crypto from 'crypto';
import { AuthTokens, JwtPayload, UserId } from '@tepla/types';
import { createLogger, UnauthorizedError } from '@tepla/common';

const logger = createLogger('auth-user-token');

interface TokenInput {
  sub: UserId;
  username: string;
  isPremium: boolean;
  sessionId: string;
}

export interface RefreshTokenPayload {
  sub: UserId;
  sid: string;
  type: 'refresh';
  jti: string;
  iat: number;
  exp: number;
}

interface JwtModule {
  sign(payload: object, secret: string, options: { expiresIn: number }): string;
  verify(token: string, secret: string): string | Record<string, unknown>;
}

export class TokenService {
  private readonly jwtSecret: string;
  private readonly accessTtlSeconds: number;
  private readonly refreshTtlSeconds: number;
  private readonly jwt: JwtModule;

  constructor() {
    this.jwt = require('jsonwebtoken') as JwtModule;
    this.jwtSecret = process.env.JWT_SECRET || 'tepla-jwt-secret-change-me';
    this.accessTtlSeconds = Number(process.env.JWT_ACCESS_TTL || '900');
    this.refreshTtlSeconds = Number(process.env.JWT_REFRESH_TTL || '2592000');

    if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET must be configured in production');
    }

    if (!process.env.JWT_SECRET) {
      logger.warn('JWT_SECRET is not configured, using development fallback secret');
    }
  }

  generateTokens(input: TokenInput): AuthTokens {
    const accessToken = this.jwt.sign(
      {
        sub: input.sub,
        username: input.username,
        isPremium: input.isPremium,
        jti: crypto.randomUUID(),
      } satisfies Omit<JwtPayload, 'iat' | 'exp'>,
      this.jwtSecret,
      { expiresIn: this.accessTtlSeconds },
    );

    const refreshToken = this.jwt.sign(
      {
        sub: input.sub,
        sid: input.sessionId,
        type: 'refresh',
        jti: crypto.randomUUID(),
      },
      this.jwtSecret,
      { expiresIn: this.refreshTtlSeconds },
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: this.accessTtlSeconds,
    };
  }

  verifyRefreshToken(token: string): RefreshTokenPayload {
    const payload = this.jwt.verify(token, this.jwtSecret);
    if (!payload || typeof payload === 'string') {
      throw new UnauthorizedError('Invalid refresh token');
    }

    if (payload.type !== 'refresh' || typeof payload.sub !== 'string' || typeof payload.sid !== 'string') {
      throw new UnauthorizedError('Invalid refresh token');
    }

    return {
      sub: payload.sub as UserId,
      sid: payload.sid,
      type: 'refresh',
      jti: typeof payload.jti === 'string' ? payload.jti : '',
      iat: typeof payload.iat === 'number' ? payload.iat : 0,
      exp: typeof payload.exp === 'number' ? payload.exp : 0,
    };
  }

  get refreshTtl(): number {
    return this.refreshTtlSeconds;
  }
}
