import jwt from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';
import { UserId, AuthTokens } from '@tepla/types';
import { RedisClient } from '@tepla/common';

interface TokenInput {
  sub: UserId;
  username: string;
  isPremium: boolean;
}

export class TokenService {
  private readonly jwtSecret: string;
  private readonly accessTtl: number;
  private readonly refreshTtl: number;

  constructor(private redis: RedisClient) {
    this.jwtSecret = process.env.JWT_SECRET || 'tepla-jwt-secret-change-me';
    this.accessTtl = parseInt(process.env.JWT_ACCESS_TTL || '900'); // 15 min
    this.refreshTtl = parseInt(process.env.JWT_REFRESH_TTL || '2592000'); // 30 days
  }

  generateTokens(input: TokenInput): AuthTokens {
    const jti = uuid();
    const accessToken = jwt.sign(
      {
        sub: input.sub,
        username: input.username,
        isPremium: input.isPremium,
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
    return jwt.verify(token, this.jwtSecret);
  }

  async revokeToken(jti: string): Promise<void> {
    await this.redis.set(`revoked:${jti}`, '1', this.accessTtl);
  }

  async isRevoked(jti: string): Promise<boolean> {
    return this.redis.exists(`revoked:${jti}`);
  }
}
