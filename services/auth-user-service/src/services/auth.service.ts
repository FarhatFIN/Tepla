import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import {
  KafkaProducer,
  RedisClient,
  ConflictError,
  ForbiddenError,
  UnauthorizedError,
  ValidationError,
  createLogger,
} from '@tepla/common';
import { EventTopic, EventType, UserId } from '@tepla/types';
import { AuthRepository, CreateAuthUserInput, DatabaseSession, DatabaseUser } from '../repositories/auth.repository';
import {
  EmailCodeVerificationInput,
  EmailLoginInput,
  EmailPasswordRegisterInput,
  LogoutInput,
  PasswordResetRequestInput,
  PasswordlessRegisterInput,
  PhoneCodeVerificationInput,
  PhoneLoginInput,
  RefreshSessionInput,
} from '../validation/auth.validation';
import { DeliveryService } from './delivery.service';
import { TokenService } from './token.service';
import { VerificationCodeService } from './verification-code.service';

const logger = createLogger('auth-user-auth-service');
const RESERVED_USERNAMES = new Set(['admin', 'tepla', 'support', 'help', 'system', 'bot', 'official', 'moderator']);

export interface RequestContext {
  correlationId: string;
  ipAddress: string;
  userAgent: string;
  deviceName: string;
}

export interface AuthenticatedUser {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  phone: string | null;
  email: string | null;
  isVerified: boolean;
  language: string;
  birthDate: string | null;
  publicKey: string;
  signingPublicKey: string;
  createdAt: string;
}

export interface AuthSessionPayload {
  user: AuthenticatedUser;
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
  sessionId: string;
}

export interface SessionView {
  id: string;
  deviceName: string | null;
  userAgent: string | null;
  ipAddress: string | null;
  lastActiveAt: string;
  createdAt: string;
}

export interface DeviceView {
  id: string;
  deviceName: string | null;
  userAgent: string | null;
  lastIpAddress: string | null;
  lastActiveAt: string;
  sessionsCount: number;
}

interface RefreshSessionState {
  userId: string;
  sessionId: string;
}

interface AuthServiceDependencies {
  repository: AuthRepository;
  redis: RedisClient;
  kafka: KafkaProducer;
  tokenService: TokenService;
  codeService: VerificationCodeService;
  deliveryService: DeliveryService;
}

export class AuthService {
  private readonly repository: AuthRepository;
  private readonly redis: RedisClient;
  private readonly kafka: KafkaProducer;
  private readonly tokenService: TokenService;
  private readonly codeService: VerificationCodeService;
  private readonly deliveryService: DeliveryService;

  constructor(dependencies: AuthServiceDependencies) {
    this.repository = dependencies.repository;
    this.redis = dependencies.redis;
    this.kafka = dependencies.kafka;
    this.tokenService = dependencies.tokenService;
    this.codeService = dependencies.codeService;
    this.deliveryService = dependencies.deliveryService;
  }

  async requestPhoneLogin(input: PhoneLoginInput): Promise<{ message: string; phone: string }> {
    await this.codeService.issuePhoneCode(input.phone, 'login');

    return {
      message: 'OTP sent',
      phone: this.maskPhone(input.phone),
    };
  }

  async verifyPhoneLogin(input: PhoneCodeVerificationInput, context: RequestContext): Promise<AuthSessionPayload> {
    const valid = await this.codeService.verifyPhoneCode(input.phone, 'login', input.code);
    if (!valid) {
      throw new UnauthorizedError('Invalid or expired OTP');
    }

    const user = await this.repository.findUserByPhone(input.phone);
    if (!user) {
      throw new UnauthorizedError('No account found. Please register first.');
    }

    return this.issueAuthenticatedSession(user, context, 'phone');
  }

  async registerPasswordless(input: PasswordlessRegisterInput, context: RequestContext): Promise<AuthSessionPayload> {
    await this.ensureUsernameAvailable(input.username);
    await this.ensureUniqueIdentity(input.email, input.phone);

    const user = await this.createUser({
      username: input.username,
      displayName: input.displayName,
      phone: input.phone,
      email: input.email,
      passwordHash: null,
      language: input.language,
      birthDate: input.birthDate,
      publicKey: input.publicKey,
      signingPublicKey: input.signingPublicKey,
      isVerified: input.phone !== null,
    });

    await this.publishUserEvent(EventType.USER_CREATED, user.id, context.correlationId, { userId: user.id });

    return this.issueAuthenticatedSession(user, context, 'passwordless');
  }

  async registerWithEmailPassword(
    input: EmailPasswordRegisterInput,
    context: RequestContext,
  ): Promise<{ message: string; email: string }> {
    await this.ensureUsernameAvailable(input.username);
    await this.ensureUniqueIdentity(input.email, null);

    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await this.createUser({
      username: input.username,
      displayName: input.displayName,
      phone: null,
      email: input.email,
      passwordHash,
      language: input.language,
      birthDate: null,
      publicKey: '',
      signingPublicKey: '',
      isVerified: false,
    });

    await this.publishUserEvent(EventType.USER_CREATED, user.id, context.correlationId, { userId: user.id });
    await this.codeService.issueEmailCode(input.email, 'register');

    return {
      message: 'Check your email for verification code',
      email: input.email,
    };
  }

  async loginWithPassword(
    input: EmailLoginInput,
  ): Promise<{ message: string; email: string; needsOtp?: boolean; needsVerification?: boolean }> {
    const user = await this.repository.findUserByEmail(input.email);
    if (!user || !user.password_hash) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const matches = await bcrypt.compare(input.password, user.password_hash);
    if (!matches) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (!user.is_verified) {
      await this.codeService.issueEmailCode(input.email, 'register');
      return {
        message: 'Email not verified',
        email: input.email,
        needsVerification: true,
      };
    }

    await this.codeService.issueEmailCode(input.email, 'login');
    return {
      message: 'Check your email for verification code',
      email: input.email,
      needsOtp: true,
    };
  }

  async verifyEmailRegistration(
    input: EmailCodeVerificationInput,
    context: RequestContext,
  ): Promise<AuthSessionPayload> {
    const valid = await this.codeService.verifyEmailCode(input.email, 'register', input.code);
    if (!valid) {
      throw new UnauthorizedError('Invalid verification code');
    }

    const user = await this.repository.findUserByEmail(input.email);
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    await this.repository.markEmailVerified(user.id);
    const verifiedUser = await this.repository.findUserById(user.id);
    if (!verifiedUser) {
      throw new UnauthorizedError('User not found');
    }

    return this.issueAuthenticatedSession(verifiedUser, context, 'email-register');
  }

  async verifyEmailLogin(input: EmailCodeVerificationInput, context: RequestContext): Promise<AuthSessionPayload> {
    const valid = await this.codeService.verifyEmailCode(input.email, 'login', input.code);
    if (!valid) {
      throw new UnauthorizedError('Invalid verification code');
    }

    const user = await this.repository.findUserByEmail(input.email);
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    const session = await this.issueAuthenticatedSession(user, context, 'email-login');
    if (user.email) {
      void this.deliveryService.sendLoginAlert(user.email, context.deviceName, context.ipAddress).catch((error: unknown) => {
        logger.warn('Failed to send login alert email', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      });
    }

    return session;
  }

  async resendCode(email: string): Promise<{ message: string }> {
    const user = await this.repository.findUserByEmail(email);
    if (!user) {
      return { message: 'If the account exists, a new code has been sent' };
    }

    if (!user.is_verified) {
      await this.codeService.issueEmailCode(email, 'register');
    } else {
      await this.codeService.issueEmailCode(email, 'login');
    }

    return { message: 'New code sent' };
  }

  async refreshSession(
    input: RefreshSessionInput,
    context: RequestContext,
  ): Promise<{ tokens: { accessToken: string; refreshToken: string; expiresIn: number } }> {
    const refreshPayload = this.tokenService.verifyRefreshToken(input.refreshToken);
    const stored = await this.redis.getJson<RefreshSessionState>(this.refreshSessionKey(input.refreshToken));
    if (!stored || stored.userId !== refreshPayload.sub || stored.sessionId !== refreshPayload.sid) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    const user = await this.repository.findUserById(stored.userId);
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    await this.repository.updateSessionActivity(stored.sessionId);
    const tokens = this.tokenService.generateTokens({
      sub: user.id as UserId,
      username: user.username,
      sessionId: stored.sessionId,
    });

    await this.redis.del(this.refreshSessionKey(input.refreshToken));
    await this.redis.srem(this.userRefreshSetKey(user.id), input.refreshToken);
    await this.storeRefreshSession(tokens.refreshToken, user.id, stored.sessionId);

    await this.publishUserEvent(EventType.USER_LOGGED_IN, user.id, context.correlationId, {
      userId: user.id,
      method: 'refresh',
      sessionId: stored.sessionId,
    });

    return { tokens };
  }

  async logout(input: LogoutInput, currentUserId?: string): Promise<{ message: string }> {
    if (input.refreshToken) {
      const stored = await this.redis.getJson<RefreshSessionState>(this.refreshSessionKey(input.refreshToken));
      if (stored) {
        if (currentUserId && stored.userId !== currentUserId) {
          throw new ForbiddenError('Cannot revoke another user session');
        }

        await this.redis.del(this.refreshSessionKey(input.refreshToken));
        await this.redis.srem(this.userRefreshSetKey(stored.userId), input.refreshToken);
        await this.repository.deleteSession(stored.sessionId, stored.userId);
        await this.markOfflineWhenNoSessionsRemain(stored.userId);
      }
    }

    if (input.sessionId) {
      const session = await this.repository.findSessionById(input.sessionId);
      if (session) {
        if (currentUserId && session.user_id !== currentUserId) {
          throw new ForbiddenError('Cannot revoke another user session');
        }

        await this.repository.deleteSession(input.sessionId, currentUserId);
        await this.markOfflineWhenNoSessionsRemain(session.user_id);
      }
    }

    return { message: 'Logged out' };
  }

  async logoutAll(userId: string): Promise<{ message: string }> {
    const refreshTokens = await this.redis.smembers(this.userRefreshSetKey(userId));
    if (refreshTokens.length > 0) {
      const refreshKeys = refreshTokens.map((token) => this.refreshSessionKey(token));
      await this.redis.del(...refreshKeys);
    }

    await this.redis.del(this.userRefreshSetKey(userId));
    await this.repository.deleteSessionsByUser(userId);
    await this.repository.markUserOffline(userId);

    return { message: 'All sessions revoked' };
  }

  async listSessions(userId: string): Promise<SessionView[]> {
    const sessions = await this.repository.listSessionsByUser(userId);
    return sessions.map((session) => this.mapSession(session));
  }

  async listDevices(userId: string): Promise<DeviceView[]> {
    const sessions = await this.repository.listSessionsByUser(userId);
    const devices = new Map<string, DeviceView>();

    for (const session of sessions) {
      const key = `${session.device_name ?? 'unknown'}|${session.user_agent ?? 'unknown'}`;
      const current = devices.get(key);
      const lastActiveAt = this.toIsoString(session.last_active_at);

      if (!current) {
        devices.set(key, {
          id: session.id,
          deviceName: session.device_name,
          userAgent: session.user_agent,
          lastIpAddress: session.ip_address,
          lastActiveAt,
          sessionsCount: 1,
        });
        continue;
      }

      current.sessionsCount += 1;
      if (new Date(lastActiveAt).getTime() > new Date(current.lastActiveAt).getTime()) {
        current.lastActiveAt = lastActiveAt;
        current.lastIpAddress = session.ip_address;
      }
    }

    return Array.from(devices.values()).sort((left, right) =>
      new Date(right.lastActiveAt).getTime() - new Date(left.lastActiveAt).getTime(),
    );
  }

  async requestPasswordReset(input: PasswordResetRequestInput): Promise<{ message: string }> {
    const user = await this.repository.findUserByEmail(input.email);
    if (user) {
      await this.codeService.issueEmailCode(input.email, 'password_reset');
    }

    return { message: 'If the account exists, reset instructions were sent' };
  }

  async checkUsernameAvailability(username: string): Promise<{ available: boolean; reason: 'reserved' | 'taken' | null }> {
    if (RESERVED_USERNAMES.has(username)) {
      return { available: false, reason: 'reserved' };
    }

    const existing = await this.repository.findUserByUsername(username);
    return {
      available: !existing,
      reason: existing ? 'taken' : null,
    };
  }

  private async ensureUsernameAvailable(username: string): Promise<void> {
    if (RESERVED_USERNAMES.has(username)) {
      throw new ValidationError('This username is reserved');
    }

    const existing = await this.repository.findUserByUsername(username);
    if (existing) {
      throw new ConflictError('Username already taken');
    }
  }

  private async ensureUniqueIdentity(email: string | null, phone: string | null): Promise<void> {
    if (email) {
      const existingEmail = await this.repository.findUserByEmail(email);
      if (existingEmail) {
        throw new ConflictError('Email already registered');
      }
    }

    if (phone) {
      const existingPhone = await this.repository.findUserByPhone(phone);
      if (existingPhone) {
        throw new ConflictError('Phone already registered');
      }
    }
  }

  private async createUser(input: CreateAuthUserInput): Promise<DatabaseUser> {
    try {
      return await this.repository.createUser(input);
    } catch (error) {
      if (this.isUniqueConstraintViolation(error)) {
        throw new ConflictError('User already exists');
      }

      throw error;
    }
  }

  private async issueAuthenticatedSession(
    user: DatabaseUser,
    context: RequestContext,
    method: 'phone' | 'passwordless' | 'email-register' | 'email-login',
  ): Promise<AuthSessionPayload> {
    const session = await this.repository.createSession({
      userId: user.id,
      deviceName: context.deviceName,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    const tokens = this.tokenService.generateTokens({
      sub: user.id as UserId,
      username: user.username,
      sessionId: session.id,
    });

    await this.storeRefreshSession(tokens.refreshToken, user.id, session.id);
    await this.repository.markUserSeenOnline(user.id);
    await this.publishUserEvent(EventType.USER_LOGGED_IN, user.id, context.correlationId, {
      userId: user.id,
      method,
      sessionId: session.id,
      ipAddress: context.ipAddress,
    });

    return {
      user: this.mapUser(user),
      tokens,
      sessionId: session.id,
    };
  }

  private async storeRefreshSession(refreshToken: string, userId: string, sessionId: string): Promise<void> {
    await this.redis.setJson(
      this.refreshSessionKey(refreshToken),
      { userId, sessionId },
      this.tokenService.refreshTtl,
    );
    await this.redis.sadd(this.userRefreshSetKey(userId), refreshToken);
    await this.redis.expire(this.userRefreshSetKey(userId), this.tokenService.refreshTtl);
  }

  private async markOfflineWhenNoSessionsRemain(userId: string): Promise<void> {
    const activeSessionCount = await this.repository.countSessionsByUser(userId);
    if (activeSessionCount === 0) {
      await this.repository.markUserOffline(userId);
    }
  }

  private async publishUserEvent(
    type: EventType,
    userId: string,
    correlationId: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    await this.kafka.publish({
      id: crypto.randomUUID(),
      type,
      topic: EventTopic.USER_EVENTS,
      timestamp: new Date().toISOString(),
      source: 'auth-user-service',
      correlationId,
      userId: userId as UserId,
      payload,
    });
  }

  private mapUser(user: DatabaseUser): AuthenticatedUser {
    return {
      id: user.id,
      username: user.username,
      displayName: user.display_name,
      avatarUrl: user.avatar_url,
      phone: user.phone,
      email: user.email,
      isVerified: user.is_verified,
      language: user.language,
      birthDate: this.toDateOnly(user.birth_date),
      publicKey: user.public_key,
      signingPublicKey: user.signing_public_key,
      createdAt: this.toIsoString(user.created_at),
    };
  }

  private mapSession(session: DatabaseSession): SessionView {
    return {
      id: session.id,
      deviceName: session.device_name,
      userAgent: session.user_agent,
      ipAddress: session.ip_address,
      lastActiveAt: this.toIsoString(session.last_active_at),
      createdAt: this.toIsoString(session.created_at),
    };
  }

  private refreshSessionKey(refreshToken: string): string {
    return `auth:refresh:${refreshToken}`;
  }

  private userRefreshSetKey(userId: string): string {
    return `auth:user-refresh:${userId}`;
  }

  private isUniqueConstraintViolation(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === '23505';
  }

  private toIsoString(value: string | Date): string {
    return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
  }

  private toDateOnly(value: string | Date | null): string | null {
    if (!value) {
      return null;
    }

    const date = value instanceof Date ? value : new Date(value);
    return date.toISOString().slice(0, 10);
  }

  private maskPhone(phone: string): string {
    return `${phone.slice(0, 3)}***${phone.slice(-2)}`;
  }
}
