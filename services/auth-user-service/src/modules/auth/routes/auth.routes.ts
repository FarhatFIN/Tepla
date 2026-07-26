import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuid } from 'uuid';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import Redis from 'ioredis';
import { RedisClient, KafkaProducer, authMiddleware, ValidationError, UnauthorizedError, ForbiddenError, createLogger, db, isUuid } from '@tepla/common';
import { EventType, EventTopic, UserId } from '@tepla/types';
import {
  SecurityRateLimiter,
  SecurityConfig,
  DeviceSecurity,
  SecurityMetrics,
  SessionManager,
  AuditLogger,
} from '@tepla/security';
import { OtpService } from '../services/otp.service';
import { TokenService } from '../services/token.service';
import { UserRepository } from '../repositories/user.repository';
import { sendOtpEmail, sendLoginAlertEmail, sendSecurityAlertEmail } from '../services/email.service';
import { RiskEngine } from '../services/risk.engine';
import { ChallengeService } from '../services/challenge.service';
import {
  base32Encode,
  matchTotpCounter,
  verifyTotp,
  verifyEd25519,
  normalizePhone,
  maskPhone,
  maskEmail,
} from '../services/totp.service';

const logger = createLogger('auth-routes');

export function authRouter(redis: RedisClient, kafka: KafkaProducer): Router {
  const router = Router();
  const otpService = new OtpService(redis);
  const tokenService = new TokenService(redis);
  const userRepo = new UserRepository();

  // Security framework components (raw ioredis instance)
  const rawRedis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  const rateLimiter = new SecurityRateLimiter(rawRedis);
  const deviceSecurity = new DeviceSecurity(rawRedis);
  const sessionManager = new SessionManager(rawRedis);
  const riskEngine = new RiskEngine(redis);
  const challengeService = new ChallengeService(redis);

  // Set audit logger redis
  AuditLogger.setRedis(rawRedis);

  type BinaryShieldPublicPattern = {
    id: string;
    pattern: string;
    usesLeft: number;
  };

  type BinaryShieldIssue = {
    seedPhrase?: string;
    recoveryPatterns: BinaryShieldPublicPattern[];
    nextManualRotationAt: string;
  };

  type BinaryShieldRow = {
    user_id: string;
    master_seed_hash: string | null;
    patterns: unknown;
    enabled: boolean;
    last_manual_rotation_at: Date | string | null;
    next_manual_rotation_at: Date | string | null;
    updated_at: Date | string | null;
  };

  let authSchemaInit: Promise<void> | null = null;

  function shouldRequireEmailOtp(): boolean {
    return process.env.AUTH_EMAIL_OTP_REQUIRED === 'true';
  }

  function shouldRequireBinaryShieldOnLogin(): boolean {
    return process.env.AUTH_BINARY_SHIELD_LOGIN === 'true';
  }

  function sha256(value: string): string {
    return crypto.createHash('sha256').update(value).digest('hex');
  }

  async function ensureAuthRuntimeSchema(): Promise<void> {
    if (!authSchemaInit) {
      authSchemaInit = (async () => {
        await db.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ');
        await db.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT');
        await db.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS shield_code_hash VARCHAR(255)');
        await db.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en'");
        await db.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS public_key TEXT DEFAULT ''");
        await db.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS signing_public_key TEXT DEFAULT ''");
        await db.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false');
        await db.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ');
        await db.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false');
        await db.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT');
        await db.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT');
        await db.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS birth_date DATE');
        await db.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_lower_unique ON users (LOWER(username))');
        await db.query(`
          CREATE TABLE IF NOT EXISTS binary_shields (
            user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
            master_seed_hash TEXT,
            patterns JSONB NOT NULL DEFAULT '[]'::jsonb,
            enabled BOOLEAN NOT NULL DEFAULT true,
            last_manual_rotation_at TIMESTAMPTZ,
            next_manual_rotation_at TIMESTAMPTZ,
            last_login_rotation_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          )
        `);
        await db.query(`
          CREATE TABLE IF NOT EXISTS binary_shield_events (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES users(id) ON DELETE CASCADE,
            event TEXT NOT NULL,
            ip_address TEXT,
            user_agent TEXT,
            details JSONB,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          )
        `);
        await db.query('CREATE INDEX IF NOT EXISTS idx_binary_shield_events_user ON binary_shield_events(user_id, created_at DESC)');
      })();
    }

    await authSchemaInit;
  }

  async function getOrCreateSavedMessages(userId: string): Promise<any> {
    const existing = await db.queryRow(
      `SELECT c.*
       FROM chats c
       LEFT JOIN chat_members cm ON cm.chat_id = c.id
       WHERE c.type = 'saved'
         AND (c.created_by = $1 OR (cm.user_id = $1 AND cm.role = 'owner'))
       ORDER BY c.created_at ASC
       LIMIT 1`,
      [userId]
    );
    if (existing) return existing;

    const chat = await db.queryRow(
      `INSERT INTO chats (id, type, name, created_by, members_count)
       VALUES ($1, 'saved', 'Saved Messages', $2, 1)
       RETURNING *`,
      [uuid(), userId]
    );
    if (!chat) throw new Error('Failed to create Saved Messages chat');

    await db.query(
      `INSERT INTO chat_members (chat_id, user_id, role)
       VALUES ($1, $2, 'owner')
       ON CONFLICT DO NOTHING`,
      [chat.id, userId]
    );

    return chat;
  }

  function generateBinaryPattern(length = 16): string {
    let out = '';
    for (let i = 0; i < length; i += 1) {
      out += crypto.randomInt(0, 2) === 0 ? 'A' : 'B';
    }
    return out;
  }

  function generateSeedPhrase(): string {
    const chunks: string[] = [];
    for (let i = 0; i < 8; i += 1) {
      chunks.push(crypto.randomBytes(3).toString('hex'));
    }
    return chunks.join('-');
  }

  function generateBinaryLoginCode(): string {
    // SECURITY: cryptographically strong 12-digit code. The previous
    // implementation derived the code from only ~90k possible bases,
    // making it trivially brute-forceable.
    let out = '';
    for (let i = 0; i < 12; i += 1) {
      out += crypto.randomInt(0, 10).toString();
    }
    return out;
  }

  async function createBinaryLoginChallenge(user: any, req: Request) {
    await ensureAuthRuntimeSchema();
    const shield = await db.queryRow<BinaryShieldRow>(
      'SELECT * FROM binary_shields WHERE user_id = $1 AND enabled = true',
      [user.id]
    );

    if (!shield) return null;

    const challengeId = uuid();
    const code = generateBinaryLoginCode();
    await redis.set(
      `binary_login:${challengeId}`,
      JSON.stringify({ userId: user.id, codeHash: sha256(code) }),
      300
    );
    await logBinaryShieldEvent(user.id, 'login_challenge_created', req, { challengeId });

    // SECURITY: the code must never be returned in the API response,
    // otherwise the second factor is defeated. Deliver it out-of-band.
    if (user.email) {
      sendOtpEmail(user.email, code).catch(() => {});
    }

    return { requiresBinaryShield: true, challengeId, expiresIn: 300 };
  }

  function buildShieldPatterns(): { publicPatterns: BinaryShieldPublicPattern[]; storedPatterns: unknown[] } {
    const publicPatterns: BinaryShieldPublicPattern[] = [];
    const storedPatterns: unknown[] = [];

    for (let i = 0; i < 8; i += 1) {
      const id = uuid();
      const pattern = generateBinaryPattern();
      publicPatterns.push({ id, pattern, usesLeft: 1 });
      storedPatterns.push({
        id,
        patternHash: sha256(pattern),
        usesLeft: 1,
        createdAt: new Date().toISOString(),
      });
    }

    return { publicPatterns, storedPatterns };
  }

  async function logBinaryShieldEvent(userId: string, event: string, req: Request, details: Record<string, unknown> = {}): Promise<void> {
    await ensureAuthRuntimeSchema();
    await db.query(
      `INSERT INTO binary_shield_events (user_id, event, ip_address, user_agent, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, event, req.ip || null, req.headers['user-agent'] || null, JSON.stringify(details)]
    );
  }

  async function createBinaryShield(userId: string, req: Request, event = 'initialized'): Promise<BinaryShieldIssue> {
    await ensureAuthRuntimeSchema();
    const seedPhrase = generateSeedPhrase();
    const { publicPatterns, storedPatterns } = buildShieldPatterns();

    const row = await db.queryRow<{ next_manual_rotation_at: Date }>(
      `INSERT INTO binary_shields (
          user_id, master_seed_hash, patterns, enabled,
          last_manual_rotation_at, next_manual_rotation_at, last_login_rotation_at, updated_at
        )
        VALUES ($1, $2, $3, true, NOW(), NOW() + INTERVAL '30 days', NOW(), NOW())
        ON CONFLICT (user_id) DO UPDATE SET
          master_seed_hash = EXCLUDED.master_seed_hash,
          patterns = EXCLUDED.patterns,
          enabled = true,
          last_manual_rotation_at = NOW(),
          next_manual_rotation_at = NOW() + INTERVAL '30 days',
          last_login_rotation_at = NOW(),
          updated_at = NOW()
        RETURNING next_manual_rotation_at`,
      [userId, sha256(seedPhrase), JSON.stringify(storedPatterns)]
    );

    await logBinaryShieldEvent(userId, event, req, { patternCount: publicPatterns.length });

    return {
      seedPhrase,
      recoveryPatterns: publicPatterns,
      nextManualRotationAt: (row?.next_manual_rotation_at || new Date(Date.now() + 30 * 24 * 3600 * 1000)).toISOString(),
    };
  }

  async function rotateBinaryShieldAfterLogin(userId: string, req: Request): Promise<BinaryShieldIssue | null> {
    await ensureAuthRuntimeSchema();
    const existing = await db.queryRow<BinaryShieldRow>(
      'SELECT * FROM binary_shields WHERE user_id = $1 AND enabled = true',
      [userId]
    );

    if (!existing) {
      return createBinaryShield(userId, req, 'initialized_on_login');
    }

    const { publicPatterns, storedPatterns } = buildShieldPatterns();
    const row = await db.queryRow<{ next_manual_rotation_at: Date | null }>(
      `UPDATE binary_shields
       SET patterns = $2, last_login_rotation_at = NOW(), updated_at = NOW()
       WHERE user_id = $1
       RETURNING next_manual_rotation_at`,
      [userId, JSON.stringify(storedPatterns)]
    );

    await logBinaryShieldEvent(userId, 'login_rotation', req, { patternCount: publicPatterns.length });

    return {
      recoveryPatterns: publicPatterns,
      nextManualRotationAt: (row?.next_manual_rotation_at || new Date(Date.now() + 30 * 24 * 3600 * 1000)).toISOString(),
    };
  }

  async function issueEmailSession(user: any, req: Request, method: string) {
    const tokens = tokenService.generateTokens({
      sub: user.id as UserId,
      username: user.username,
    });

    const deviceFingerprint = DeviceSecurity.fingerprint(
      req.headers as Record<string, string>,
      req.cookies?.deviceId
    );
    const session = await sessionManager.create(user.id, {
      deviceFingerprint,
      userAgent: req.headers['user-agent'] || 'unknown',
      ip: req.ip || 'unknown',
    });

    await redis.set(`session:${tokens.refreshToken}`, user.id, 30 * 24 * 3600);
    await getOrCreateSavedMessages(user.id);
    await userRepo.updateLastSeen(user.id);
    await deviceSecurity.registerDevice(user.id, deviceFingerprint, {
      userAgent: req.headers['user-agent'] || 'unknown',
      ip: req.ip || 'unknown',
    });

    await kafka.publish({
      id: uuid(),
      type: EventType.USER_LOGGED_IN,
      topic: EventTopic.USER_EVENTS,
      timestamp: new Date().toISOString(),
      source: 'auth-service',
      correlationId: req.correlationId || uuid(),
      userId: user.id as UserId,
      payload: { userId: user.id, method },
    });

    const binaryShield = method === 'email_register'
      ? await createBinaryShield(user.id, req)
      : await rotateBinaryShieldAfterLogin(user.id, req);

    return {
      user: mapUser(user),
      tokens,
      token: tokens.accessToken,
      accessToken: tokens.accessToken,
      sessionId: session,
      binaryShield,
    };
  }

  function setAuthCookies(res: Response, tokens: { accessToken: string; refreshToken: string; expiresIn: number }): void {
    const secure = process.env.NODE_ENV === 'production';
    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
      maxAge: tokens.expiresIn * 1000,
    });
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
  }

  function clearAuthCookies(res: Response): void {
    const secure = process.env.NODE_ENV === 'production';
    for (const name of ['accessToken', 'refreshToken']) {
      res.clearCookie(name, { httpOnly: true, secure, sameSite: 'lax', path: '/' });
    }
  }

  function extractBearerToken(req: Request): string | null {
    const header = req.headers.authorization;
    if (header?.startsWith('Bearer ')) {
      const token = header.slice(7).trim();
      if (token) return token;
    }
    return req.cookies?.accessToken || null;
  }

  /**
   * Verify a TOTP code and burn it.
   *
   * Plain `verifyTotp` accepts the same six digits for the whole ±1-step
   * window, so a code observed over the user's shoulder (or replayed from a
   * proxy log) stays usable for up to 90 seconds. Recording the accepted
   * counter makes each code single-use per account.
   */
  async function verifyTotpOnce(userId: string, secret: string, code: string): Promise<boolean> {
    const counter = matchTotpCounter(secret, code);
    if (counter === null) return false;

    const usedKey = `totp_used:${userId}:${counter}`;
    const firstUse = await rawRedis.set(usedKey, '1', 'EX', 120, 'NX');
    return firstUse === 'OK';
  }

  // в”Ђв”Ђв”Ђ Email OTP Helpers в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
  function generateEmailOtp(): string {
    return crypto.randomInt(100000, 999999).toString();
  }

  /**
   * OTP purposes. The purpose is bound into the stored record so that a code
   * minted for one flow cannot be redeemed by another (C-05).
   */
  type OtpPurpose = 'login' | 'verify_email';

  async function storeAndSendEmailOtp(email: string, purpose: OtpPurpose): Promise<void> {
    // Rate limit: 1 per 60s
    const cooldownKey = `otp_cooldown:${email}`;
    if (await redis.exists(cooldownKey)) {
      throw new ValidationError('Please wait 60 seconds before requesting a new code');
    }

    const code = generateEmailOtp();
    const otpData = JSON.stringify({ code, purpose, attempts: 0, createdAt: Date.now() });
    await redis.set(`otp:${email}`, otpData, 600); // 10 min TTL
    await redis.set(cooldownKey, '1', 60);

    await sendOtpEmail(email, code);
  }

  /** Is a code of this purpose currently outstanding for this address? */
  async function hasPendingOtp(email: string, purpose: OtpPurpose): Promise<boolean> {
    const raw = await redis.get(`otp:${email}`);
    if (!raw) return false;
    try {
      return (JSON.parse(raw) as { purpose?: string }).purpose === purpose;
    } catch {
      return false;
    }
  }

  // Atomic OTP verification via Lua script вЂ” prevents race-condition brute-force
  const OTP_VERIFY_LUA = `
    local key = KEYS[1]
    local code = ARGV[1]
    local maxAttempts = tonumber(ARGV[2])
    local purpose = ARGV[3]
    local raw = redis.call('GET', key)
    if not raw then return -1 end
    local data = cjson.decode(raw)
    if data.attempts >= maxAttempts then return -2 end
    if data.purpose ~= purpose then return -3 end
    if data.code ~= code then
      data.attempts = data.attempts + 1
      local ttl = redis.call('TTL', key)
      if ttl < 1 then ttl = 600 end
      redis.call('SETEX', key, ttl, cjson.encode(data))
      return 0
    end
    redis.call('DEL', key)
    return 1
  `;

  async function verifyEmailOtp(email: string, code: string, purpose: OtpPurpose): Promise<boolean> {
    const result = await redis.eval(OTP_VERIFY_LUA, [`otp:${email}`], [code, '5', purpose]) as number;
    if (result === -1) return false;         // key not found / expired
    if (result === -2) throw new ValidationError('Too many attempts. Request a new code.');
    if (result === -3) return false;         // code was minted for a different flow
    return result === 1;                     // 1 = match, 0 = wrong code
  }

  // POST /api/auth/login/phone вЂ” request OTP
  router.post('/login/phone', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { phone } = req.body;
      if (!phone || typeof phone !== 'string') {
        throw new ValidationError('Phone number is required');
      }

      const normalized = normalizePhone(phone);

      // Security: check auth rate limit with progressive lockout
      await rateLimiter.checkAuth(normalized);

      await otpService.sendOtp(normalized);

      await AuditLogger.log('otp_requested', {
        phone: maskPhone(normalized),
        ip: req.ip,
      });

      res.json({ success: true, data: { message: 'OTP sent', phone: maskPhone(normalized) } });
    } catch (err) { next(err); }
  });

  // POST /api/auth/login/verify вЂ” verify OTP, return tokens
  router.post('/login/verify', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { phone, code } = req.body;
      if (!phone || !code) throw new ValidationError('Phone and code are required');

      const normalized = normalizePhone(phone);
      const valid = await otpService.verifyOtp(normalized, code);

      if (!valid) {
        // Record auth failure for progressive lockout
        await rateLimiter.recordAuthFailure(normalized);
        await SecurityMetrics.authFailure(rawRedis);
        await AuditLogger.log('otp_verify_failed', {
          phone: maskPhone(normalized),
          ip: req.ip,
        });
        throw new UnauthorizedError('Invalid or expired OTP');
      }

      // Clear failures on success
      await rateLimiter.clearAuthFailures(normalized);
      await SecurityMetrics.authSuccess(rawRedis);

      let user = await userRepo.findByPhone(normalized);
      if (!user) {
        throw new UnauthorizedError('No account found. Please register first.');
      }

      // Generate JWT tokens
      const tokens = tokenService.generateTokens({
        sub: user.id as UserId,
        username: user.username,
      });

      // Create secure session (tracked in SessionManager)
      const deviceFingerprint = DeviceSecurity.fingerprint(
        req.headers as Record<string, string>,
        req.cookies?.deviceId
      );
      const session = await sessionManager.create(user.id, {
        deviceFingerprint,
        userAgent: req.headers['user-agent'] || 'unknown',
        ip: req.ip || 'unknown',
      });

      // Also store refresh token mapping
      await redis.set(`session:${tokens.refreshToken}`, user.id, 30 * 24 * 3600);
      await getOrCreateSavedMessages(user.id);
      await userRepo.updateLastSeen(user.id);

      // H-02: check for a suspicious device/IP BEFORE registering the device.
      // Registering first marks it known, so this check could never report an
      // anomaly — the whole "new device from unknown location" signal was dead.
      const anomaly = await deviceSecurity.detectAnomaly(
        user.id,
        deviceFingerprint,
        req.ip || 'unknown'
      );

      // Register device
      await deviceSecurity.registerDevice(user.id, deviceFingerprint, {
        userAgent: req.headers['user-agent'] || 'unknown',
        ip: req.ip || 'unknown',
      });

      await AuditLogger.log('login_success', {
        userId: user.id,
        ip: req.ip,
        deviceFingerprint,
        anomaly: anomaly.suspicious ? anomaly.reason : null,
      });

      // Publish login event
      await kafka.publish({
        id: uuid(),
        type: EventType.USER_LOGGED_IN,
        topic: EventTopic.USER_EVENTS,
        timestamp: new Date().toISOString(),
        source: 'auth-service',
        correlationId: req.correlationId || uuid(),
        userId: user.id as UserId,
        payload: {
          userId: user.id,
          deviceFingerprint,
          ip: req.ip,
        },
      });

      res.json({
        success: true,
        data: {
          user: mapUser(user),
          tokens,
          sessionId: session,
          securityAlert: anomaly.suspicious ? {
            message: 'New device or location detected',
            reason: anomaly.reason,
          } : undefined,
        },
      });
    } catch (err) { next(err); }
  });

  // POST /api/auth/register вЂ” create account
  router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
    try {
      await ensureAuthRuntimeSchema();
      const { username, displayName, phone, email, language, birthDate, dateOfBirth, date_of_birth, description, bio, avatar, avatarUrl, publicKey, signingPublicKey, shield_code, shieldCode } = req.body;

      if (!username || username.length < 4 || username.length > 32) {
        throw new ValidationError('Username must be 4-32 characters');
      }
      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        throw new ValidationError('Username can only contain letters, numbers, underscores');
      }

      const existing = await userRepo.findByUsername(username);
      if (existing) throw new ValidationError('Username already taken');

      if (phone) {
        const existingPhone = await userRepo.findByPhone(normalizePhone(phone));
        if (existingPhone) throw new ValidationError('Phone already registered');
      }

      const user = await userRepo.create({
        username: username.toLowerCase(),
        display_name: displayName || null,
        phone: phone ? normalizePhone(phone) : null,
        email: email || null,
        shield_code_hash: shield_code || shieldCode ? await bcrypt.hash(String(shield_code || shieldCode), 12) : null,
        language: language || 'en',
        birth_date: birthDate || dateOfBirth || date_of_birth || null,
        avatar_url: avatarUrl || avatar || null,
        bio: description || bio || null,
        public_key: publicKey || '',
        signing_public_key: signingPublicKey || '',
      });

      const tokens = tokenService.generateTokens({
        sub: user.id as UserId,
        username: user.username,
      });

      // Create secure session
      const deviceFingerprint = DeviceSecurity.fingerprint(
        req.headers as Record<string, string>,
        req.cookies?.deviceId
      );
      const session = await sessionManager.create(user.id, {
        deviceFingerprint,
        userAgent: req.headers['user-agent'] || 'unknown',
        ip: req.ip || 'unknown',
      });

      await redis.set(`session:${tokens.refreshToken}`, user.id, 30 * 24 * 3600);
      await getOrCreateSavedMessages(user.id);

      // Register first device as trusted
      await deviceSecurity.registerDevice(user.id, deviceFingerprint, {
        userAgent: req.headers['user-agent'] || 'unknown',
        ip: req.ip || 'unknown',
      });
      await deviceSecurity.trustDevice(user.id, deviceFingerprint);

      await AuditLogger.log('user_registered', {
        userId: user.id,
        username: user.username,
        ip: req.ip,
      });

      // Publish user.created event
      await kafka.publish<{ userId: string }>({
        id: uuid(),
        type: EventType.USER_CREATED,
        topic: EventTopic.USER_EVENTS,
        timestamp: new Date().toISOString(),
        source: 'auth-service',
        correlationId: req.correlationId || uuid(),
        userId: user.id as UserId,
        payload: { userId: user.id },
      });

      setAuthCookies(res, tokens);
      res.status(201).json({
        success: true,
        data: { user: mapUser(user), tokens, token: tokens.accessToken, accessToken: tokens.accessToken, sessionId: session },
      });
    } catch (err) { next(err); }
  });

  // POST /api/auth/login вЂ” email + password в†’ send OTP
  router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
    try {
      await ensureAuthRuntimeSchema();
      const { email, password, shield_code, shieldCode } = req.body;
      if (!email || !password) throw new ValidationError('Email and password are required');

      const normalizedEmail = email.toLowerCase().trim();
      await rateLimiter.checkAuth(normalizedEmail);

      const user = await userRepo.findByEmail(normalizedEmail);
      if (!user || !user.password_hash) {
        await rateLimiter.recordAuthFailure(normalizedEmail);
        await SecurityMetrics.authFailure(rawRedis);
        throw new UnauthorizedError('Invalid email or password');
      }

      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        await rateLimiter.recordAuthFailure(normalizedEmail);
        await SecurityMetrics.authFailure(rawRedis);
        throw new UnauthorizedError('Invalid email or password');
      }

      await rateLimiter.clearAuthFailures(normalizedEmail);
      await SecurityMetrics.authSuccess(rawRedis);

      const submittedShieldCode = shield_code || shieldCode;
      if (user.shield_code_hash) {
        const shieldOk = submittedShieldCode
          ? await bcrypt.compare(String(submittedShieldCode), user.shield_code_hash)
          : false;
        if (!shieldOk) {
          await rateLimiter.recordAuthFailure(normalizedEmail);
          await SecurityMetrics.authFailure(rawRedis);
          throw new ForbiddenError('Неверный Shield-код');
        }
      }
      // M-06: when the account had no Shield code, the login path used to
      // *enrol* whatever the request supplied. Someone holding only the
      // password could therefore plant a Shield code and lock the real owner
      // out of their own second factor. Enrolment belongs to an authenticated
      // settings flow, not to login.

      if (!shouldRequireEmailOtp()) {
        if (!user.is_verified) {
          await userRepo.markEmailVerified(user.id);
          user.is_verified = true;
        }

        // M-15: `createBinaryLoginChallenge` was fully implemented, the client
        // already handles `requiresBinaryShield`, and `/login/binary-verify`
        // exists — but nothing ever called the helper, so the Binary Shield
        // second factor was inert. Wire it in behind a flag so enabling it is
        // a deliberate choice (it depends on working outbound email).
        if (shouldRequireBinaryShieldOnLogin()) {
          const challenge = await createBinaryLoginChallenge(user, req);
          if (challenge) {
            return res.json({ success: true, data: challenge });
          }
        }

        const data = await issueEmailSession(user, req, 'email');
        setAuthCookies(res, data.tokens);
        return res.json({ success: true, data });
      }

      // If email not verified, send OTP for verification
      if (!user.is_verified) {
        await storeAndSendEmailOtp(normalizedEmail, 'verify_email');
        return res.json({
          success: true,
          data: { message: 'Email not verified', email: normalizedEmail, needsVerification: true },
        });
      }

      // Check if 2FA is enabled вЂ” require second step
      const totpRow = await userRepo.getTotpSecret(user.id);
      if (totpRow?.is_verified) {
        const challengeId = uuid();
        await redis.set(`2fa:challenge:${challengeId}`, user.id, 300);
        return res.json({
          success: true,
          data: { requires2FA: true, challengeId },
        });
      }

      // Send OTP for login verification вЂ” do NOT return JWT yet
      await storeAndSendEmailOtp(normalizedEmail, 'login');

      await AuditLogger.log('login_otp_sent', { userId: user.id, ip: req.ip });

      res.json({
        success: true,
        data: { message: 'Check your email for verification code', email: normalizedEmail, needsOtp: true },
      });
    } catch (err) { next(err); }
  });

  router.post('/login/binary-verify', async (req: Request, res: Response, next: NextFunction) => {
    try {
      await ensureAuthRuntimeSchema();
      const { challengeId, code } = req.body || {};
      if (!challengeId || !code) {
        throw new ValidationError('Binary Shield challenge and code are required');
      }

      // SECURITY: limit brute-force attempts per challenge
      const attemptsKey = `binary_login_attempts:${challengeId}`;
      const attempts = await redis.incr(attemptsKey);
      if (attempts === 1) await redis.expire(attemptsKey, 300);
      if (attempts > 5) {
        await redis.del(`binary_login:${challengeId}`);
        throw new UnauthorizedError('Too many attempts. Challenge invalidated.');
      }

      const raw = await redis.get(`binary_login:${challengeId}`);
      if (!raw) {
        throw new UnauthorizedError('Binary Shield challenge expired');
      }

      const challenge = JSON.parse(raw) as { userId: string; codeHash: string };
      if (challenge.codeHash !== sha256(String(code).trim())) {
        await logBinaryShieldEvent(challenge.userId, 'login_challenge_failed', req, { challengeId });
        throw new UnauthorizedError('Invalid Binary Shield code');
      }

      await redis.del(`binary_login:${challengeId}`);
      const user = await userRepo.findById(challenge.userId);
      if (!user) throw new UnauthorizedError('User not found');

      await logBinaryShieldEvent(user.id, 'login_challenge_verified', req, { challengeId });
      const data = await issueEmailSession(user, req, 'email_binary');
      setAuthCookies(res, data.tokens);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  });

  // POST /api/auth/verify-login вЂ” verify login OTP в†’ return JWT
  router.post('/verify-login', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, code } = req.body;
      if (!email || !code) throw new ValidationError('Email and code are required');

      const normalizedEmail = email.toLowerCase().trim();
      const valid = await verifyEmailOtp(normalizedEmail, code, 'login');
      if (!valid) {
        await rateLimiter.recordAuthFailure(normalizedEmail);
        await SecurityMetrics.authFailure(rawRedis);
        throw new UnauthorizedError('Invalid verification code');
      }

      await rateLimiter.clearAuthFailures(normalizedEmail);
      await SecurityMetrics.authSuccess(rawRedis);

      const user = await userRepo.findByEmail(normalizedEmail);
      if (!user) throw new UnauthorizedError('User not found');

      // C-05: the email code is a *second* factor, never a replacement for
      // TOTP. If the account has 2FA enabled, hand back a challenge instead of
      // tokens — otherwise the OTP path silently skips the authenticator.
      const totpRow = await userRepo.getTotpSecret(user.id);
      if (totpRow?.is_verified) {
        const challengeId = uuid();
        await redis.set(`2fa:challenge:${challengeId}`, user.id, 300);
        return res.json({ success: true, data: { requires2FA: true, challengeId } });
      }

      const tokens = tokenService.generateTokens({
        sub: user.id as UserId,
        username: user.username,
      });

      const deviceFingerprint = DeviceSecurity.fingerprint(
        req.headers as Record<string, string>,
        req.cookies?.deviceId
      );
      const session = await sessionManager.create(user.id, {
        deviceFingerprint,
        userAgent: req.headers['user-agent'] || 'unknown',
        ip: req.ip || 'unknown',
      });

      await redis.set(`session:${tokens.refreshToken}`, user.id, 30 * 24 * 3600);
      await getOrCreateSavedMessages(user.id);
      await userRepo.updateLastSeen(user.id);
      await deviceSecurity.registerDevice(user.id, deviceFingerprint, {
        userAgent: req.headers['user-agent'] || 'unknown',
        ip: req.ip || 'unknown',
      });

      await AuditLogger.log('login_email_success', { userId: user.id, ip: req.ip });

      // Send login alert email (non-blocking)
      const alertDevice = req.headers['user-agent'] || 'Unknown device';
      sendLoginAlertEmail(normalizedEmail, alertDevice, req.ip || 'unknown').catch(() => {});

      await kafka.publish({
        id: uuid(),
        type: EventType.USER_LOGGED_IN,
        topic: EventTopic.USER_EVENTS,
        timestamp: new Date().toISOString(),
        source: 'auth-service',
        correlationId: req.correlationId || uuid(),
        userId: user.id as UserId,
        payload: { userId: user.id, method: 'email' },
      });

      res.json({
        success: true,
        data: { user: mapUser(user), tokens, sessionId: session, binaryShield: await rotateBinaryShieldAfterLogin(user.id, req) },
      });
    } catch (err) { next(err); }
  });

  // POST /api/auth/resend-code вЂ” resend a code for an ALREADY PENDING flow
  //
  // C-05: this endpoint used to mint a brand-new login OTP for any address, with
  // no authentication and no prior login attempt. Combined with /verify-login —
  // which happily exchanges that OTP for a full token pair — it formed a
  // complete bypass of the password, the Shield code and TOTP: knowing (or
  // controlling) the mailbox was sufficient, and 2FA was never consulted.
  //
  // A resend must only ever re-send a code for a flow the user already started.
  router.post('/resend-code', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = req.body || {};
      if (!email || typeof email !== 'string') throw new ValidationError('Email is required');

      const normalizedEmail = email.toLowerCase().trim();

      // Hourly rate limit: max 5 resends per hour
      const hourlyKey = `otp_hourly:${normalizedEmail}`;
      const hourlyCount = await redis.get(hourlyKey);
      if (hourlyCount && parseInt(hourlyCount) >= 5) {
        throw new ValidationError('Too many requests. Try again later.');
      }

      const pendingLogin = await hasPendingOtp(normalizedEmail, 'login');
      const pendingVerify = await hasPendingOtp(normalizedEmail, 'verify_email');

      if (pendingLogin || pendingVerify) {
        await storeAndSendEmailOtp(normalizedEmail, pendingLogin ? 'login' : 'verify_email');

        // Increment hourly counter
        const current = await redis.incr(hourlyKey);
        if (current === 1) await redis.expire(hourlyKey, 3600);

        await AuditLogger.log('otp_resent', { email: maskEmail(normalizedEmail), ip: req.ip });
      } else {
        await AuditLogger.log('otp_resend_without_pending', { email: maskEmail(normalizedEmail), ip: req.ip });
      }

      // Same response either way — otherwise this becomes an oracle for
      // "does this address have a login in progress?".
      res.json({ success: true, data: { message: 'New code sent' } });
    } catch (err) { next(err); }
  });

  // POST /api/auth/register/email вЂ” register with email + password в†’ send OTP
  router.post('/register/email', async (req: Request, res: Response, next: NextFunction) => {
    try {
      await ensureAuthRuntimeSchema();
      const { username, displayName, email, password, language, birthDate, dateOfBirth, date_of_birth, description, bio, avatar, avatarUrl, shield_code, shieldCode } = req.body;

      if (!email || !password) throw new ValidationError('Email and password are required');
      if (password.length < 6) throw new ValidationError('Password must be at least 6 characters');
      if (!username || username.length < 4 || username.length > 32) {
        throw new ValidationError('Username must be 4-32 characters');
      }
      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        throw new ValidationError('Username can only contain letters, numbers, underscores');
      }

      const existingUsername = await userRepo.findByUsername(username);
      if (existingUsername) throw new ValidationError('Username already taken');

      const normalizedEmail = email.toLowerCase().trim();
      const existingEmail = await userRepo.findByEmail(normalizedEmail);
      if (existingEmail) throw new ValidationError('Email already registered');

      const passwordHash = await bcrypt.hash(password, 10);

      const user = await userRepo.create({
        username: username.toLowerCase(),
        display_name: displayName || null,
        phone: null,
        email: normalizedEmail,
        password_hash: passwordHash,
        shield_code_hash: shield_code || shieldCode ? await bcrypt.hash(String(shield_code || shieldCode), 12) : null,
        language: language || 'en',
        birth_date: birthDate || dateOfBirth || date_of_birth || null,
        avatar_url: avatarUrl || avatar || null,
        bio: description || bio || null,
        public_key: '',
        signing_public_key: '',
      });

      await AuditLogger.log('user_registered_email', {
        userId: user.id, username: user.username, ip: req.ip,
      });

      await kafka.publish<{ userId: string }>({
        id: uuid(),
        type: EventType.USER_CREATED,
        topic: EventTopic.USER_EVENTS,
        timestamp: new Date().toISOString(),
        source: 'auth-service',
        correlationId: req.correlationId || uuid(),
        userId: user.id as UserId,
        payload: { userId: user.id },
      });

      if (!shouldRequireEmailOtp()) {
        await userRepo.markEmailVerified(user.id);
        user.is_verified = true;

        const data = await issueEmailSession(user, req, 'email_register');
        setAuthCookies(res, data.tokens);
        return res.status(201).json({ success: true, data });
      }

      // Send OTP email вЂ” do NOT return JWT yet
      await storeAndSendEmailOtp(normalizedEmail, 'verify_email');

      res.status(201).json({
        success: true,
        data: { message: 'Check your email for verification code', email: normalizedEmail },
      });
    } catch (err) { next(err); }
  });

  // POST /api/auth/verify-email вЂ” verify registration OTP в†’ return JWT
  router.post('/verify-email', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, code } = req.body;
      if (!email || !code) throw new ValidationError('Email and code are required');

      const normalizedEmail = email.toLowerCase().trim();
      const valid = await verifyEmailOtp(normalizedEmail, code, 'verify_email');
      if (!valid) {
        await rateLimiter.recordAuthFailure(normalizedEmail);
        throw new UnauthorizedError('Invalid verification code');
      }

      await rateLimiter.clearAuthFailures(normalizedEmail);

      const user = await userRepo.findByEmail(normalizedEmail);
      if (!user) throw new UnauthorizedError('User not found');

      // Mark email as verified
      await userRepo.markEmailVerified(user.id);

      const tokens = tokenService.generateTokens({
        sub: user.id as UserId,
        username: user.username,
      });

      const deviceFingerprint = DeviceSecurity.fingerprint(
        req.headers as Record<string, string>,
        req.cookies?.deviceId
      );
      const session = await sessionManager.create(user.id, {
        deviceFingerprint,
        userAgent: req.headers['user-agent'] || 'unknown',
        ip: req.ip || 'unknown',
      });

      await redis.set(`session:${tokens.refreshToken}`, user.id, 30 * 24 * 3600);
      await getOrCreateSavedMessages(user.id);
      await deviceSecurity.registerDevice(user.id, deviceFingerprint, {
        userAgent: req.headers['user-agent'] || 'unknown',
        ip: req.ip || 'unknown',
      });
      await deviceSecurity.trustDevice(user.id, deviceFingerprint);
      await userRepo.updateLastSeen(user.id);

      await AuditLogger.log('email_verified', { userId: user.id, ip: req.ip });

      setAuthCookies(res, tokens);
      res.json({
        success: true,
        data: { user: mapUser(user), tokens, token: tokens.accessToken, accessToken: tokens.accessToken, sessionId: session, binaryShield: await createBinaryShield(user.id, req) },
      });
    } catch (err) { next(err); }
  });

  // POST /api/auth/refresh вЂ” refresh tokens
  router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { refreshToken } = req.body || {};
      const token = refreshToken || req.cookies?.refreshToken;
      if (!token) throw new ValidationError('Refresh token required');

      const userId = await redis.get(`session:${token}`);
      if (!userId) throw new UnauthorizedError('Invalid or expired refresh token');

      const user = await userRepo.findById(userId);
      if (!user) throw new UnauthorizedError('User not found');

      // Rotate tokens
      await redis.del(`session:${token}`);
      const tokens = tokenService.generateTokens({
        sub: user.id as UserId,
        username: user.username,
      });
      await redis.set(`session:${tokens.refreshToken}`, user.id, 30 * 24 * 3600);
      await getOrCreateSavedMessages(user.id);

      await AuditLogger.log('token_refreshed', { userId: user.id, ip: req.ip });

      setAuthCookies(res, tokens);
      res.json({ success: true, data: { tokens, token: tokens.accessToken, accessToken: tokens.accessToken } });
    } catch (err) { next(err); }
  });

  router.get('/me', authMiddleware(), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.sub;
      if (!userId) throw new UnauthorizedError('No user in request');

      const user = await userRepo.findById(userId);
      if (!user) throw new UnauthorizedError('User not found');

      const savedMessages = await getOrCreateSavedMessages(user.id);
      res.json({ success: true, data: { user: mapUser(user), savedMessages } });
    } catch (err) { next(err); }
  });

  // POST /api/auth/logout
  router.post('/logout', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { refreshToken, sessionId } = req.body || {};

      const presentedRefresh = refreshToken || req.cookies?.refreshToken;
      if (presentedRefresh) {
        await redis.del(`session:${presentedRefresh}`);
      }

      // Revoke security session
      if (sessionId) {
        await sessionManager.revoke(sessionId);
      }

      // H-03: revoke the *access* token too. Deleting the refresh mapping only
      // stops future refreshes; the bearer token in the caller's hand stayed
      // valid for the rest of its 15-minute TTL, so "log out" did not actually
      // end the session. authMiddleware now consults `revoked:<jti>`.
      const accessToken = extractBearerToken(req);
      if (accessToken) {
        try {
          const payload = tokenService.verifyAccessToken(accessToken);
          if (payload?.jti) await tokenService.revokeToken(payload.jti);
        } catch {
          // An expired or malformed token needs no revocation.
        }
      }

      clearAuthCookies(res);
      await AuditLogger.log('logout', { ip: req.ip });

      res.json({ success: true, data: { message: 'Logged out' } });
    } catch (err) { next(err); }
  });

  // в”Ђв”Ђв”Ђ 2FA / TOTP в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ

  const auth = authMiddleware();

  // в”Ђв”Ђв”Ђ Security sessions & devices в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
  //
  // C-01: these six routes used to sit ~600 lines above, deriving the caller's
  // identity from the `x-user-id` **request header** with no auth middleware at
  // all. Two of them (`GET /sessions`, `DELETE /sessions/:id`) were additionally
  // shadowed by correctly-authenticated duplicates further down the file —
  // Express matches the first registration, so the insecure versions were the
  // live ones and the safe ones were unreachable dead code.
  //
  // The gateway strips client-supplied `x-user-id` before proxying, but this
  // service also listens on :3001 directly. Anything that reached that port —
  // a pod on the same network, an SSRF, a misconfigured ingress — could list
  // and revoke any account's sessions and devices by naming its id.
  //
  // Identity now comes from the verified JWT, never from a header.

  // POST /api/auth/logout/all — revoke all sessions
  router.post('/logout/all', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.sub;
      await sessionManager.revokeAll(userId);
      await AuditLogger.log('logout_all_sessions', { userId, ip: req.ip });
      res.json({ success: true, data: { message: 'All sessions revoked' } });
    } catch (err) { next(err); }
  });

  // GET /api/auth/security-sessions — list active security sessions
  router.get('/security-sessions', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.sub;
      const sessions = await sessionManager.getActiveSessions(userId);

      // SECURITY: never expose raw session tokens. Sessions are identified
      // by a derived hash id; the client marks its own session by sending
      // its token in the x-session-token header.
      const currentToken = (req.headers['x-session-token'] as string) || '';
      const sanitized = sessions
        .map((session) => ({
          id: sha256(session.token).slice(0, 16),
          deviceFingerprint: session.deviceFingerprint || null,
          ipAddress: session.ipAddress || null,
          userAgent: session.userAgent || null,
          created: session.created,
          isCurrent: Boolean(currentToken) && session.token === currentToken,
        }))
        .sort((a, b) => b.created - a.created);

      res.json({ success: true, data: sanitized });
    } catch (err) { next(err); }
  });

  // DELETE /api/auth/security-sessions/:id — terminate a single security session
  router.delete('/security-sessions/:id', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.sub;
      const sessions = await sessionManager.getActiveSessions(userId);
      const target = sessions.find((session) => sha256(session.token).slice(0, 16) === req.params.id);
      if (!target) throw new ValidationError('Session not found');

      await sessionManager.revoke(target.token);
      await AuditLogger.log('session_terminated', { userId, sessionId: req.params.id, ip: req.ip });

      res.json({ success: true, data: { id: req.params.id, revoked: true } });
    } catch (err) { next(err); }
  });

  // POST /api/auth/sessions/revoke-others - terminate all sessions except the current one
  router.post('/sessions/revoke-others', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.sub;
      const currentToken = (req.headers['x-session-token'] as string) || req.body?.currentToken;
      if (!currentToken) throw new ValidationError('Current session token is required');

      const sessions = await sessionManager.getActiveSessions(userId);
      const current = sessions.find((session) => session.token === currentToken);
      if (!current) throw new UnauthorizedError('Current session not found');

      let revoked = 0;
      for (const session of sessions) {
        if (session.token !== currentToken) {
          await sessionManager.revoke(session.token);
          revoked += 1;
        }
      }
      await AuditLogger.log('sessions_revoked_others', { userId, revoked, ip: req.ip });

      res.json({ success: true, data: { revoked } });
    } catch (err) { next(err); }
  });

  // GET /api/auth/devices вЂ” list registered devices
  router.get('/devices', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const devices = await deviceSecurity.getUserDevices(req.user!.sub);
      res.json({ success: true, data: devices });
    } catch (err) { next(err); }
  });

  // DELETE /api/auth/devices/:fingerprint вЂ” revoke device
  router.delete('/devices/:fingerprint', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.sub;
      await deviceSecurity.revokeDevice(userId, req.params.fingerprint);

      await AuditLogger.log('device_revoked', {
        userId,
        deviceFingerprint: req.params.fingerprint,
        ip: req.ip,
      });

      res.json({ success: true, data: { message: 'Device revoked' } });
    } catch (err) { next(err); }
  });

  // Tepla Binary Shield status, device log, controlled rotation, and master-seed reset.
  router.get('/binary-shield/status', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.sub;
    await ensureAuthRuntimeSchema();

      const shield = await db.queryRow<BinaryShieldRow>(
        'SELECT * FROM binary_shields WHERE user_id = $1',
        [userId]
      );
      const sessions = await sessionManager.getActiveSessions(userId);
      const events = await db.queryRows(
        `SELECT event, ip_address AS "ipAddress", user_agent AS "userAgent", details, created_at AS "createdAt"
         FROM binary_shield_events
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 30`,
        [userId]
      );

      res.json({
        success: true,
        data: {
          enabled: !!shield?.enabled,
          activeSessions: sessions.length,
          nextManualRotationAt: shield?.next_manual_rotation_at || null,
          events,
        },
      });
    } catch (err) { next(err); }
  });

  router.post('/binary-shield/rotate', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.sub;
      const emergency = req.body?.emergency === true;
      await ensureAuthRuntimeSchema();

      const sessions = await sessionManager.getActiveSessions(userId);
      if (!emergency && sessions.length > 1) {
        throw new ForbiddenError('Binary Shield rotation requires exactly one active session');
      }

      const shield = await db.queryRow<BinaryShieldRow>(
        'SELECT * FROM binary_shields WHERE user_id = $1',
        [userId]
      );
      const nextRotation = shield?.next_manual_rotation_at
        ? new Date(shield.next_manual_rotation_at)
        : null;

      if (!emergency && nextRotation && nextRotation.getTime() > Date.now()) {
        throw new ValidationError('Binary Shield can be rotated once per 30 days');
      }

      const issue = await createBinaryShield(userId, req, emergency ? 'emergency_rotation' : 'manual_rotation');
      res.json({ success: true, data: issue });
    } catch (err) { next(err); }
  });

  router.post('/binary-shield/master-reset', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.sub;
      const { masterSeed } = req.body || {};
      if (!masterSeed || typeof masterSeed !== 'string') {
        throw new ValidationError('Master seed is required');
      }

      await ensureAuthRuntimeSchema();
      const shield = await db.queryRow<BinaryShieldRow>(
        'SELECT * FROM binary_shields WHERE user_id = $1 AND enabled = true',
        [userId]
      );
      if (!shield?.master_seed_hash || shield.master_seed_hash !== sha256(masterSeed)) {
        await logBinaryShieldEvent(userId, 'master_reset_failed', req);
        throw new UnauthorizedError('Invalid master seed');
      }

      await sessionManager.revokeAll(userId);
      await db.query(
        `UPDATE binary_shields
         SET enabled = false, patterns = '[]'::jsonb, master_seed_hash = NULL, updated_at = NOW()
         WHERE user_id = $1`,
        [userId]
      );
      await logBinaryShieldEvent(userId, 'master_reset', req, { sessionsRevoked: true });

      res.json({
        success: true,
        data: {
          requiresReinitialize: true,
          message: 'Binary Shield reset. Sign in again and reinitialize protection.',
        },
      });
    } catch (err) { next(err); }
  });

  // POST /api/auth/2fa/setup вЂ” generate TOTP secret + backup codes
  router.post('/2fa/setup', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.sub;

      // Check if already has verified 2FA
      const existing = await userRepo.getTotpSecret(userId);
      if (existing?.is_verified) {
        throw new ValidationError('2FA is already enabled. Disable it first.');
      }

      // Generate 20-byte secret (base32 encoded for authenticator apps)
      const secretBytes = crypto.randomBytes(20);
      const secret = base32Encode(secretBytes);

      // Generate 8 backup codes
      const backupCodes = Array.from({ length: 8 }, () =>
        crypto.randomBytes(4).toString('hex')
      );

      await userRepo.saveTotpSecret(userId, secret, backupCodes);

      // M-14: `user` was dereferenced without a null check — a token for a
      // deleted account produced a TypeError and a 500 instead of a 401.
      const user = await userRepo.findById(userId);
      if (!user) throw new UnauthorizedError('User not found');

      const issuer = 'Tepla';
      // The label must be percent-encoded: an unescaped username containing
      // `?`, `#` or `&` corrupts the otpauth URI and the QR code with it.
      const label = encodeURIComponent(`${issuer}:${user.username}`);
      const otpauthUrl = `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&digits=6&period=30`;

      await AuditLogger.log('2fa_setup_started', { userId, ip: req.ip });

      res.json({
        success: true,
        data: { secret, otpauthUrl, backupCodes },
      });
    } catch (err) { next(err); }
  });

  // POST /api/auth/2fa/verify вЂ” verify TOTP code to activate 2FA
  router.post('/2fa/verify', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.sub;
      const { code } = req.body;
      if (!code) throw new ValidationError('TOTP code is required');

      const totpRow = await userRepo.getTotpSecret(userId);
      if (!totpRow) throw new ValidationError('2FA not set up. Call /2fa/setup first.');
      if (totpRow.is_verified) throw new ValidationError('2FA is already verified');

      const valid = verifyTotp(totpRow.secret, code);
      if (!valid) throw new UnauthorizedError('Invalid TOTP code');

      await userRepo.verifyTotp(userId);
      await AuditLogger.log('2fa_enabled', { userId, ip: req.ip });

      res.json({ success: true, data: { message: '2FA enabled successfully' } });
    } catch (err) { next(err); }
  });

  // POST /api/auth/2fa/disable вЂ” disable 2FA (requires current TOTP code or backup code)
  router.post('/2fa/disable', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.sub;
      const { code } = req.body || {};
      if (!code) throw new ValidationError('TOTP code or backup code is required');

      // C-07: disabling 2FA is exactly as sensitive as passing it, and it was
      // completely unthrottled.
      const attempt = await rateLimiter.recordFactorAttempt(
        `2fa_disable:${userId}`,
        SecurityConfig.MAX_FACTOR_ATTEMPTS,
        SecurityConfig.FACTOR_ATTEMPT_WINDOW,
      );
      if (!attempt.allowed) throw new ForbiddenError('Too many attempts. Try again later.');

      const totpRow = await userRepo.getTotpSecret(userId);
      if (!totpRow || !totpRow.is_verified) {
        throw new ValidationError('2FA is not enabled');
      }

      // Try TOTP code first, then backup code
      const validTotp = await verifyTotpOnce(userId, totpRow.secret, String(code));
      if (!validTotp) {
        const usedBackup = await userRepo.useBackupCode(userId, code);
        if (!usedBackup) throw new UnauthorizedError('Invalid code');
      }

      await rateLimiter.clearFactorAttempts(`2fa_disable:${userId}`);
      await userRepo.deleteTotp(userId);
      await AuditLogger.log('2fa_disabled', { userId, ip: req.ip });

      res.json({ success: true, data: { message: '2FA disabled' } });
    } catch (err) { next(err); }
  });

  // POST /api/auth/2fa/login вЂ” complete login with 2FA code (after challenge)
  router.post('/2fa/login', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { challengeId, code } = req.body || {};
      if (!challengeId || !code) throw new ValidationError('challengeId and code are required');

      // C-07: there was no attempt ceiling here. A 6-digit TOTP with a ±1 step
      // window is ~3·10^5 candidates, and the backup codes are 8 hex chars —
      // both trivially brute-forceable against an unthrottled endpoint holding
      // a 5-minute challenge.
      const attempt = await rateLimiter.recordFactorAttempt(
        `2fa_login:${challengeId}`,
        SecurityConfig.MAX_FACTOR_ATTEMPTS,
        300,
      );
      if (!attempt.allowed) {
        await redis.del(`2fa:challenge:${challengeId}`);
        await SecurityMetrics.authFailure(rawRedis);
        throw new UnauthorizedError('Too many attempts. Challenge invalidated.');
      }

      const userId = await redis.get(`2fa:challenge:${challengeId}`);
      if (!userId) throw new UnauthorizedError('Invalid or expired 2FA challenge');

      const totpRow = await userRepo.getTotpSecret(userId);
      if (!totpRow || !totpRow.is_verified) {
        throw new ValidationError('2FA is not enabled');
      }

      const validTotp = await verifyTotpOnce(userId, totpRow.secret, String(code));
      if (!validTotp) {
        const usedBackup = await userRepo.useBackupCode(userId, code);
        if (!usedBackup) {
          await SecurityMetrics.authFailure(rawRedis);
          throw new UnauthorizedError('Invalid 2FA code');
        }
      }

      await rateLimiter.clearFactorAttempts(`2fa_login:${challengeId}`);

      // 2FA passed вЂ” issue tokens
      await redis.del(`2fa:challenge:${challengeId}`);
      const user = await userRepo.findById(userId);
      if (!user) throw new UnauthorizedError('User not found');

      const tokens = tokenService.generateTokens({
        sub: user.id as UserId,
        username: user.username,
      });

      const deviceFingerprint = DeviceSecurity.fingerprint(
        req.headers as Record<string, string>,
        req.cookies?.deviceId
      );
      const session = await sessionManager.create(user.id, {
        deviceFingerprint,
        userAgent: req.headers['user-agent'] || 'unknown',
        ip: req.ip || 'unknown',
      });

      await redis.set(`session:${tokens.refreshToken}`, user.id, 30 * 24 * 3600);
      await userRepo.updateLastSeen(user.id);

      await AuditLogger.log('2fa_login_success', { userId: user.id, ip: req.ip });

      res.json({
        success: true,
        data: { user: mapUser(user), tokens, sessionId: session },
      });
    } catch (err) { next(err); }
  });

  // в”Ђв”Ђв”Ђ PIN System в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ

  // POST /api/auth/pin/set
  router.post('/pin/set', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.sub;
      const { pin } = req.body;
      if (!pin || pin.length !== 6 || !/^\d{6}$/.test(pin)) {
        throw new ValidationError('PIN must be exactly 6 digits');
      }

      const pinHash = await bcrypt.hash(pin, 10);
      await db.query(`UPDATE users SET pin_hash = $1 WHERE id = $2`, [pinHash, userId]);

      await AuditLogger.log('pin_set', { userId, ip: req.ip });
      res.json({ success: true, data: { message: 'PIN set successfully' } });
    } catch (err) { next(err); }
  });

  // POST /api/auth/pin/verify
  router.post('/pin/verify', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, pin } = req.body || {};
      if (!isUuid(userId) || typeof pin !== 'string') throw new ValidationError('userId and pin are required');

      // A PIN is a *local unlock* factor, not a credential strong enough to
      // mint a session on its own. Keep the endpoint (the lock screen depends
      // on it) but gate it behind the same lockout as password login, so a
      // known user id plus a 6-digit space is not walkable.
      await rateLimiter.checkAuth(`pin:${userId}`);

      // Atomic rate limit: 5 per user per hour via Lua.
      // SECURITY: keyed by userId only - deviceId is client-controlled and
      // could be rotated to bypass the limit and brute-force the 6-digit PIN.
      const rlKey = `pin_attempts:${userId}`;
      const PIN_RL_LUA = `
        local key = KEYS[1]
        local max = tonumber(ARGV[1])
        local ttl = tonumber(ARGV[2])
        local cur = tonumber(redis.call('GET', key) or '0')
        if cur >= max then return -1 end
        redis.call('INCR', key)
        if cur == 0 then redis.call('EXPIRE', key, ttl) end
        return cur + 1
      `;
      const rlResult = await redis.eval(PIN_RL_LUA, [rlKey], ['5', '3600']) as number;
      if (rlResult === -1) throw new ForbiddenError('Too many PIN attempts. Try again later.');

      const user = await userRepo.findById(userId);
      if (!user || !user.pin_hash) throw new UnauthorizedError('PIN not set');

      const valid = await bcrypt.compare(pin, user.pin_hash);
      if (!valid) {
        await rateLimiter.recordAuthFailure(`pin:${userId}`);
        await AuditLogger.log('pin_verify_failed', { userId, ip: req.ip });
        throw new UnauthorizedError('Invalid PIN');
      }

      await redis.del(rlKey);
      await rateLimiter.clearAuthFailures(`pin:${userId}`);

      const tokens = tokenService.generateTokens({
        sub: user.id as UserId,
        username: user.username,
      });
      await redis.set(`session:${tokens.refreshToken}`, user.id, 30 * 24 * 3600);

      await AuditLogger.log('pin_verify_success', { userId, ip: req.ip });
      res.json({ success: true, data: { tokens, user: mapUser(user) } });
    } catch (err) { next(err); }
  });

  // POST /api/auth/pin/reset
  //
  // M-03: this used to answer "User not found" for unknown addresses, turning
  // it into a free membership oracle. The response is now identical either way
  // and a challenge id is always returned (an unknown address simply gets one
  // that can never be satisfied).
  router.post('/pin/reset', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = req.body || {};
      if (!email || typeof email !== 'string') throw new ValidationError('Email is required');

      const normalizedEmail = email.toLowerCase().trim();
      await rateLimiter.checkAuth(`pin_reset:${normalizedEmail}`);

      const user = await userRepo.findByEmail(normalizedEmail);
      const challengeId = user
        ? (await challengeService.createOtpChallenge(normalizedEmail, user.id)).challengeId
        : uuid();

      res.json({ success: true, data: { challengeId, message: 'Check your email' } });
    } catch (err) { next(err); }
  });

  // в”Ђв”Ђв”Ђ Biometric System в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ

  // POST /api/auth/biometric/register
  router.post('/biometric/register', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.sub;
      const { publicKey, deviceId } = req.body;
      if (!publicKey || !deviceId) throw new ValidationError('publicKey and deviceId required');

      await db.query(
        `UPDATE devices SET biometric_public_key = $1 WHERE user_id = $2 AND device_id = $3`,
        [publicKey, userId, deviceId]
      );

      await AuditLogger.log('biometric_registered', { userId, deviceId, ip: req.ip });
      res.json({ success: true, data: { message: 'Biometric registered' } });
    } catch (err) { next(err); }
  });

  // POST /api/auth/biometric/challenge — obtain a single-use nonce to sign
  //
  // H-15: the old scheme had the client sign `${userId}:${deviceId}:${unixSeconds}`
  // and the server brute-forced 301 candidate timestamps, calling `crypto.verify`
  // for each. Three separate problems:
  //   1. 301 Ed25519 verifications per request is a cheap CPU-exhaustion lever
  //      for an unauthenticated endpoint.
  //   2. The signed payload is fully predictable, so any captured signature was
  //      replayable by anyone for the next five minutes.
  //   3. `crypto.verify` needs a KeyObject or DER/PEM — a raw 32-byte base64
  //      Ed25519 key throws, so the endpoint could never have succeeded anyway.
  // A server-issued nonce fixes all three: one verification, no replay.
  router.post('/biometric/challenge', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, deviceId } = req.body || {};
      if (!isUuid(userId) || !deviceId) throw new ValidationError('userId and deviceId required');

      await rateLimiter.checkAuth(`biometric:${userId}`);

      const nonce = crypto.randomBytes(32).toString('base64url');
      await redis.set(`biometric_nonce:${userId}:${deviceId}`, nonce, 120);

      res.json({ success: true, data: { nonce, expiresIn: 120 } });
    } catch (err) { next(err); }
  });

  // POST /api/auth/biometric/login
  router.post('/biometric/login', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, deviceId, signature, nonce } = req.body || {};
      if (!isUuid(userId) || !deviceId || !signature || !nonce) {
        throw new ValidationError('userId, deviceId, nonce and signature required');
      }

      const attempt = await rateLimiter.recordFactorAttempt(
        `biometric:${userId}:${deviceId}`,
        SecurityConfig.MAX_FACTOR_ATTEMPTS,
        SecurityConfig.FACTOR_ATTEMPT_WINDOW,
      );
      if (!attempt.allowed) throw new ForbiddenError('Too many attempts. Try again later.');

      const nonceKey = `biometric_nonce:${userId}:${deviceId}`;
      const expectedNonce = await redis.get(nonceKey);
      if (!expectedNonce || expectedNonce !== String(nonce)) {
        throw new UnauthorizedError('Invalid or expired challenge');
      }
      // Burn the nonce before verifying, so a failed attempt cannot be retried
      // against the same challenge.
      await redis.del(nonceKey);

      const device = await db.queryRow(
        `SELECT * FROM devices WHERE user_id = $1 AND device_id = $2 AND biometric_public_key IS NOT NULL`,
        [userId, deviceId]
      );
      if (!device) throw new UnauthorizedError('Biometric not registered for this device');

      const signatureValid = verifyEd25519(
        device.biometric_public_key,
        Buffer.from(`${userId}:${deviceId}:${expectedNonce}`, 'utf8'),
        String(signature),
      );

      if (!signatureValid) {
        await AuditLogger.log('biometric_login_failed', { userId, deviceId, ip: req.ip, reason: 'invalid_signature' });
        throw new UnauthorizedError('Biometric signature verification failed');
      }

      await rateLimiter.clearFactorAttempts(`biometric:${userId}:${deviceId}`);
      const user = await userRepo.findById(userId);
      if (!user) throw new UnauthorizedError('User not found');

      const tokens = tokenService.generateTokens({
        sub: user.id as UserId,
        username: user.username,
      });
      await redis.set(`session:${tokens.refreshToken}`, user.id, 30 * 24 * 3600);

      await AuditLogger.log('biometric_login', { userId, deviceId, ip: req.ip });
      res.json({ success: true, data: { tokens, user: mapUser(user) } });
    } catch (err) { next(err); }
  });

  // в”Ђв”Ђв”Ђ Risk-based Login в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ

  // POST /api/auth/login/init вЂ” new device login with risk assessment
  router.post('/login/init', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = req.body;
      if (!email) throw new ValidationError('Email is required');

      const normalizedEmail = email.toLowerCase().trim();
      await rateLimiter.checkAuth(normalizedEmail);

      const user = await userRepo.findByEmail(normalizedEmail);
      // M-03: "User not found" here told an unauthenticated caller whether an
      // address is registered. Return the same shape for unknown accounts —
      // the challenge id simply never resolves.
      if (!user) {
        await AuditLogger.log('login_init_unknown_email', { email: maskEmail(normalizedEmail), ip: req.ip });
        return res.json({
          success: true,
          data: { challengeId: uuid(), challengeType: 'otp', riskLevel: 'medium' },
        });
      }
      if (user.blocked_until && new Date(user.blocked_until) > new Date()) {
        throw new ForbiddenError('Account temporarily blocked');
      }

      const fingerprint = RiskEngine.generateFingerprint(req.headers as Record<string, string>);
      const riskScore = await riskEngine.calculateRiskScore({
        userId: user.id,
        fingerprint,
        ip: req.ip || '0.0.0.0',
      });

      const requiredAuth = riskEngine.getRequiredAuth(riskScore);

      if (requiredAuth === 'blocked') {
        await sendSecurityAlertEmail(normalizedEmail, 'Suspicious login blocked', req.headers['user-agent'] || 'Unknown', req.ip || 'unknown');
        throw new ForbiddenError('Login blocked due to security concerns');
      }

      let challenge;
      if (requiredAuth === 'number_challenge') {
        challenge = await challengeService.createNumberChallenge(normalizedEmail, user.id, req.headers['user-agent'], req.ip);
      } else {
        challenge = await challengeService.createOtpChallenge(normalizedEmail, user.id);
      }

      await AuditLogger.log('login_init', { userId: user.id, riskScore, requiredAuth, ip: req.ip });

      res.json({
        success: true,
        data: {
          challengeId: challenge.challengeId,
          challengeType: challenge.type,
          displayNumber: challenge.type === 'number_challenge' ? (challenge as any).displayNumber : undefined,
          riskLevel: riskEngine.getRiskLevel(riskScore),
        },
      });
    } catch (err) { next(err); }
  });

  // POST /api/auth/login/challenge-verify вЂ” verify challenge (OTP or number)
  router.post('/login/challenge-verify', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { challengeId, answer, challengeType, deviceName } = req.body;
      if (!challengeId || answer === undefined) throw new ValidationError('challengeId and answer required');

      let result;
      if (challengeType === 'number_challenge') {
        result = await challengeService.verifyNumberChallenge(challengeId, parseInt(answer));
      } else {
        result = await challengeService.verifyOtp(challengeId, String(answer));
      }

      if (!result.valid) {
        await SecurityMetrics.authFailure(rawRedis);
        throw new UnauthorizedError('Invalid code');
      }

      const userId = result.userId || (result as any).pendingData?.userId;
      if (!userId) throw new UnauthorizedError('Invalid challenge');

      const user = await userRepo.findById(userId);
      if (!user) throw new UnauthorizedError('User not found');

      // Create/trust device.
      //
      // M-05: a fresh random `deviceId` was minted on *every* login, so the
      // `ON CONFLICT (user_id, device_id)` clause could never fire and the
      // `devices` table grew by one trusted row per sign-in, forever. Reuse the
      // row that already matches this browser's fingerprint instead.
      const fingerprint = RiskEngine.generateFingerprint(req.headers as Record<string, string>);
      const known = await db.queryRow<{ device_id: string }>(
        'SELECT device_id FROM devices WHERE user_id = $1 AND fingerprint = $2 LIMIT 1',
        [userId, fingerprint]
      );
      const deviceId = known?.device_id || crypto.randomUUID();

      await db.query(
        `INSERT INTO devices (user_id, device_id, fingerprint, name, is_trusted, trust_expires_at, last_ip)
         VALUES ($1, $2, $3, $4, true, NOW() + INTERVAL '30 days', $5)
         ON CONFLICT (user_id, device_id) DO UPDATE SET fingerprint = $3, is_trusted = true, trust_expires_at = NOW() + INTERVAL '30 days', last_ip = $5, last_active = NOW()`,
        [userId, deviceId, fingerprint, deviceName || req.headers['user-agent'] || 'Unknown', req.ip]
      );

      const tokens = tokenService.generateTokens({
        sub: user.id as UserId,
        username: user.username,
      });

      await redis.set(`session:${tokens.refreshToken}`, user.id, 30 * 24 * 3600);
      await userRepo.updateLastSeen(user.id);

      // Send login alert
      sendLoginAlertEmail(user.email, req.headers['user-agent'] || 'Unknown', req.ip || 'unknown').catch(() => {});

      await AuditLogger.log('login_challenge_success', { userId, ip: req.ip });

      res.json({
        success: true,
        data: { user: mapUser(user), tokens, deviceId },
      });
    } catch (err) { next(err); }
  });

  // POST /api/auth/login/trusted вЂ” trusted device login
  router.post('/login/trusted', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, deviceId, pinHash, biometricSignature, nonce } = req.body || {};
      if (!isUuid(userId) || !deviceId) throw new ValidationError('userId and deviceId required');

      // C-06: this endpoint had no throttling at all, so the 6-digit PIN below
      // could be walked at request rate. `/pin/verify` at least had a counter;
      // this one was a wide-open second door to the same secret.
      const attempt = await rateLimiter.recordFactorAttempt(
        `trusted_login:${userId}:${deviceId}`,
        SecurityConfig.MAX_FACTOR_ATTEMPTS,
        SecurityConfig.FACTOR_ATTEMPT_WINDOW,
      );
      if (!attempt.allowed) throw new ForbiddenError('Too many attempts. Try again later.');

      const device = await db.queryRow(
        `SELECT * FROM devices WHERE user_id = $1 AND device_id = $2`,
        [userId, deviceId]
      );
      if (!device || !device.is_trusted) throw new UnauthorizedError('Device not trusted');
      if (device.trust_expires_at && new Date(device.trust_expires_at) < new Date()) {
        throw new UnauthorizedError('Device trust expired');
      }

      const fingerprint = RiskEngine.generateFingerprint(req.headers as Record<string, string>);
      const riskScore = await riskEngine.calculateRiskScore({ userId, deviceId, fingerprint, ip: req.ip || '0.0.0.0' });

      if (riskScore > 30) {
        return res.json({ success: true, data: { needsChallenge: true, riskLevel: riskEngine.getRiskLevel(riskScore) } });
      }

      // Verify PIN or biometric
      const user = await userRepo.findById(userId);
      if (!user) throw new UnauthorizedError('User not found');

      if (pinHash && user.pin_hash) {
        // NB: despite the field name the client sends the PIN itself — bcrypt
        // compares a plaintext candidate against the stored hash.
        const valid = await bcrypt.compare(String(pinHash), user.pin_hash);
        if (!valid) throw new UnauthorizedError('Invalid PIN');
      } else if (biometricSignature && device.biometric_public_key) {
        const nonceKey = `biometric_nonce:${userId}:${deviceId}`;
        const expectedNonce = await redis.get(nonceKey);
        if (!expectedNonce || expectedNonce !== String(nonce)) {
          throw new UnauthorizedError('Invalid or expired challenge');
        }
        await redis.del(nonceKey);

        const bioValid = verifyEd25519(
          device.biometric_public_key,
          Buffer.from(`${userId}:${deviceId}:${expectedNonce}`, 'utf8'),
          String(biometricSignature),
        );
        if (!bioValid) throw new UnauthorizedError('Biometric signature verification failed');
      } else {
        throw new ValidationError('PIN or biometric required');
      }

      await rateLimiter.clearFactorAttempts(`trusted_login:${userId}:${deviceId}`);

      const tokens = tokenService.generateTokens({
        sub: user.id as UserId,
        username: user.username,
      });
      await redis.set(`session:${tokens.refreshToken}`, user.id, 30 * 24 * 3600);

      await db.query(`UPDATE devices SET last_active = NOW(), last_ip = $1 WHERE id = $2`, [req.ip, device.id]);
      await AuditLogger.log('trusted_device_login', { userId, deviceId, ip: req.ip });

      res.json({ success: true, data: { tokens, user: mapUser(user) } });
    } catch (err) { next(err); }
  });

  // --- Active sessions / devices -------------------------------------

  // GET /api/auth/sessions - list this user's devices/sessions
  router.get('/sessions', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.sub;
      const fingerprint = RiskEngine.generateFingerprint(req.headers as Record<string, string>);
      const result: any = await db.query(
        `SELECT device_id, name, fingerprint, last_ip, last_active, created_at, is_trusted
         FROM devices WHERE user_id = $1
         ORDER BY last_active DESC NULLS LAST, created_at DESC`,
        [userId]
      );
      const rows: any[] = result?.rows ?? result ?? [];
      res.json({
        success: true,
        data: rows.map((d) => ({
          deviceId: d.device_id,
          name: d.name,
          lastIp: d.last_ip,
          lastActive: d.last_active,
          createdAt: d.created_at,
          isTrusted: d.is_trusted,
          isCurrent: d.fingerprint === fingerprint,
        })),
      });
    } catch (err) { next(err); }
  });

  // DELETE /api/auth/sessions - terminate all sessions except the current device
  router.delete('/sessions', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.sub;
      const fingerprint = RiskEngine.generateFingerprint(req.headers as Record<string, string>);
      await db.query(
        `DELETE FROM devices WHERE user_id = $1 AND fingerprint IS DISTINCT FROM $2`,
        [userId, fingerprint]
      );
      await AuditLogger.log('sessions_terminated_all', { userId, ip: req.ip });
      res.json({ success: true, data: { terminated: 'others' } });
    } catch (err) { next(err); }
  });

  // DELETE /api/auth/sessions/:deviceId - terminate a single device session
  router.delete('/sessions/:deviceId', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.sub;
      await db.query(
        `DELETE FROM devices WHERE user_id = $1 AND device_id = $2`,
        [userId, req.params.deviceId]
      );
      await AuditLogger.log('session_terminated', { userId, deviceId: req.params.deviceId, ip: req.ip });
      res.json({ success: true, data: { deviceId: req.params.deviceId, terminated: true } });
    } catch (err) { next(err); }
  });

  // GET /api/auth/check-username/:username
  router.get('/check-username/:username', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { username } = req.params;
      if (!username || username.length < 4) {
        return res.json({ success: true, data: { available: false } });
      }
      const existing = await userRepo.findByUsername(username.toLowerCase());
      res.json({ success: true, data: { available: !existing } });
    } catch (err) { next(err); }
  });

  return router;
}

// ─── Helpers ───────────────────────────────
//
// TOTP, base32, Ed25519 verification and the masking helpers now live in
// ./services/totp.service so they can be unit tested on their own; this file
// was past 1800 lines and none of that logic needs Express or Redis.

function mapUser(row: any) {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    phone: row.phone,
    email: row.email,
    avatarUrl: row.avatar_url,
    bio: row.bio,
    birthDate: row.birth_date,
    isOnline: row.is_online,
    isVerified: row.is_verified,
    language: row.language,
    publicKey: row.public_key,
    signingPublicKey: row.signing_public_key,
    createdAt: row.created_at,
  };
}
