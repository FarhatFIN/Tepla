import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuid } from 'uuid';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import Redis from 'ioredis';
import { RedisClient, KafkaProducer, authMiddleware, ValidationError, UnauthorizedError, ForbiddenError, createLogger, db } from '@tepla/common';
import { EventType, EventTopic, UserId } from '@tepla/types';
import {
  SecurityRateLimiter,
  DeviceSecurity,
  SecurityMetrics,
  SessionManager,
  AuditLogger,
  CryptoCore,
} from '@tepla/security';
import { OtpService } from '../services/otp.service';
import { TokenService } from '../services/token.service';
import { UserRepository } from '../repositories/user.repository';
import { sendOtpEmail, sendLoginAlertEmail, sendSecurityAlertEmail } from '../services/email.service';
import { RiskEngine } from '../services/risk.engine';
import { ChallengeService } from '../services/challenge.service';

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

  let binaryShieldInit: Promise<void> | null = null;

  function shouldRequireEmailOtp(): boolean {
    return process.env.AUTH_EMAIL_OTP_REQUIRED === 'true';
  }

  function sha256(value: string): string {
    return crypto.createHash('sha256').update(value).digest('hex');
  }

  async function ensureBinaryShieldTables(): Promise<void> {
    if (!binaryShieldInit) {
      binaryShieldInit = (async () => {
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

    await binaryShieldInit;
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
    await ensureBinaryShieldTables();
    await db.query(
      `INSERT INTO binary_shield_events (user_id, event, ip_address, user_agent, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, event, req.ip || null, req.headers['user-agent'] || null, JSON.stringify(details)]
    );
  }

  async function createBinaryShield(userId: string, req: Request, event = 'initialized'): Promise<BinaryShieldIssue> {
    await ensureBinaryShieldTables();
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
    await ensureBinaryShieldTables();
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

    return { user: mapUser(user), tokens, sessionId: session, binaryShield };
  }

  // в”Ђв”Ђв”Ђ Email OTP Helpers в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
  function generateEmailOtp(): string {
    return crypto.randomInt(100000, 999999).toString();
  }

  async function storeAndSendEmailOtp(email: string): Promise<void> {
    // Rate limit: 1 per 60s
    const cooldownKey = `otp_cooldown:${email}`;
    if (await redis.exists(cooldownKey)) {
      throw new ValidationError('Please wait 60 seconds before requesting a new code');
    }

    const code = generateEmailOtp();
    const otpData = JSON.stringify({ code, attempts: 0, createdAt: Date.now() });
    await redis.set(`otp:${email}`, otpData, 600); // 10 min TTL
    await redis.set(cooldownKey, '1', 60);

    await sendOtpEmail(email, code);
  }

  // Atomic OTP verification via Lua script вЂ” prevents race-condition brute-force
  const OTP_VERIFY_LUA = `
    local key = KEYS[1]
    local code = ARGV[1]
    local maxAttempts = tonumber(ARGV[2])
    local raw = redis.call('GET', key)
    if not raw then return -1 end
    local data = cjson.decode(raw)
    if data.attempts >= maxAttempts then return -2 end
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

  async function verifyEmailOtp(email: string, code: string): Promise<boolean> {
    const result = await redis.eval(OTP_VERIFY_LUA, [`otp:${email}`], [code, '5']) as number;
    if (result === -1) return false;         // key not found / expired
    if (result === -2) throw new ValidationError('Too many attempts. Request a new code.');
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
      await userRepo.updateLastSeen(user.id);

      // Register device
      await deviceSecurity.registerDevice(user.id, deviceFingerprint, {
        userAgent: req.headers['user-agent'] || 'unknown',
        ip: req.ip || 'unknown',
      });

      // Check for suspicious device/IP
      const anomaly = await deviceSecurity.detectAnomaly(
        user.id,
        deviceFingerprint,
        req.ip || 'unknown'
      );

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
      const { username, displayName, phone, email, language, birthDate, publicKey, signingPublicKey } = req.body;

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
        language: language || 'en',
        birth_date: birthDate || null,
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

      res.status(201).json({
        success: true,
        data: { user: mapUser(user), tokens, sessionId: session },
      });
    } catch (err) { next(err); }
  });

  // POST /api/auth/login вЂ” email + password в†’ send OTP
  router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;
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

      if (!shouldRequireEmailOtp()) {
        if (!user.is_verified) {
          await userRepo.markEmailVerified(user.id);
          user.is_verified = true;
        }

        const data = await issueEmailSession(user, req, 'email');
        return res.json({ success: true, data });
      }

      // If email not verified, send OTP for verification
      if (!user.is_verified) {
        await storeAndSendEmailOtp(normalizedEmail);
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
      await storeAndSendEmailOtp(normalizedEmail);

      await AuditLogger.log('login_otp_sent', { userId: user.id, ip: req.ip });

      res.json({
        success: true,
        data: { message: 'Check your email for verification code', email: normalizedEmail, needsOtp: true },
      });
    } catch (err) { next(err); }
  });

  // POST /api/auth/verify-login вЂ” verify login OTP в†’ return JWT
  router.post('/verify-login', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, code } = req.body;
      if (!email || !code) throw new ValidationError('Email and code are required');

      const normalizedEmail = email.toLowerCase().trim();
      const valid = await verifyEmailOtp(normalizedEmail, code);
      if (!valid) {
        await rateLimiter.recordAuthFailure(normalizedEmail);
        await SecurityMetrics.authFailure(rawRedis);
        throw new UnauthorizedError('Invalid verification code');
      }

      await rateLimiter.clearAuthFailures(normalizedEmail);
      await SecurityMetrics.authSuccess(rawRedis);

      const user = await userRepo.findByEmail(normalizedEmail);
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

  // POST /api/auth/resend-code вЂ” resend OTP email
  router.post('/resend-code', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = req.body;
      if (!email) throw new ValidationError('Email is required');

      const normalizedEmail = email.toLowerCase().trim();

      // Hourly rate limit: max 5 resends per hour
      const hourlyKey = `otp_hourly:${normalizedEmail}`;
      const hourlyCount = await redis.get(hourlyKey);
      if (hourlyCount && parseInt(hourlyCount) >= 5) {
        throw new ValidationError('Too many requests. Try again later.');
      }

      await storeAndSendEmailOtp(normalizedEmail);

      // Increment hourly counter
      const current = await redis.incr(hourlyKey);
      if (current === 1) await redis.expire(hourlyKey, 3600);

      await AuditLogger.log('otp_resent', { email: normalizedEmail.replace(/(.{2}).*(@.*)/, '$1***$2'), ip: req.ip });

      res.json({ success: true, data: { message: 'New code sent' } });
    } catch (err) { next(err); }
  });

  // POST /api/auth/register/email вЂ” register with email + password в†’ send OTP
  router.post('/register/email', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { username, displayName, email, password, language } = req.body;

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
        language: language || 'en',
        birth_date: null,
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
        return res.status(201).json({ success: true, data });
      }

      // Send OTP email вЂ” do NOT return JWT yet
      await storeAndSendEmailOtp(normalizedEmail);

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
      const valid = await verifyEmailOtp(normalizedEmail, code);
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
      await deviceSecurity.registerDevice(user.id, deviceFingerprint, {
        userAgent: req.headers['user-agent'] || 'unknown',
        ip: req.ip || 'unknown',
      });
      await deviceSecurity.trustDevice(user.id, deviceFingerprint);
      await userRepo.updateLastSeen(user.id);

      await AuditLogger.log('email_verified', { userId: user.id, ip: req.ip });

      res.json({
        success: true,
        data: { user: mapUser(user), tokens, sessionId: session, binaryShield: await createBinaryShield(user.id, req) },
      });
    } catch (err) { next(err); }
  });

  // POST /api/auth/refresh вЂ” refresh tokens
  router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) throw new ValidationError('Refresh token required');

      const userId = await redis.get(`session:${refreshToken}`);
      if (!userId) throw new UnauthorizedError('Invalid or expired refresh token');

      const user = await userRepo.findById(userId);
      if (!user) throw new UnauthorizedError('User not found');

      // Rotate tokens
      await redis.del(`session:${refreshToken}`);
      const tokens = tokenService.generateTokens({
        sub: user.id as UserId,
        username: user.username,
      });
      await redis.set(`session:${tokens.refreshToken}`, user.id, 30 * 24 * 3600);

      await AuditLogger.log('token_refreshed', { userId: user.id, ip: req.ip });

      res.json({ success: true, data: { tokens } });
    } catch (err) { next(err); }
  });

  // POST /api/auth/logout
  router.post('/logout', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { refreshToken, sessionId } = req.body;

      if (refreshToken) {
        await redis.del(`session:${refreshToken}`);
      }

      // Revoke security session
      if (sessionId) {
        await sessionManager.revoke(sessionId);
      }

      await AuditLogger.log('logout', { ip: req.ip });

      res.json({ success: true, data: { message: 'Logged out' } });
    } catch (err) { next(err); }
  });

  // POST /api/auth/logout/all вЂ” revoke all sessions
  router.post('/logout/all', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.headers['x-user-id'] as string;
      if (!userId) throw new UnauthorizedError('User ID required');

      await sessionManager.revokeAll(userId);

      await AuditLogger.log('logout_all_sessions', { userId, ip: req.ip });

      res.json({ success: true, data: { message: 'All sessions revoked' } });
    } catch (err) { next(err); }
  });

  // GET /api/auth/sessions вЂ” list active sessions
  router.get('/sessions', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.headers['x-user-id'] as string;
      if (!userId) throw new UnauthorizedError('User ID required');

      const sessions = await sessionManager.getActiveSessions(userId);

      res.json({ success: true, data: sessions });
    } catch (err) { next(err); }
  });

  // GET /api/auth/devices вЂ” list registered devices
  router.get('/devices', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.headers['x-user-id'] as string;
      if (!userId) throw new UnauthorizedError('User ID required');

      const devices = await deviceSecurity.getUserDevices(userId);

      res.json({ success: true, data: devices });
    } catch (err) { next(err); }
  });

  // DELETE /api/auth/devices/:fingerprint вЂ” revoke device
  router.delete('/devices/:fingerprint', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.headers['x-user-id'] as string;
      if (!userId) throw new UnauthorizedError('User ID required');

      await deviceSecurity.revokeDevice(userId, req.params.fingerprint);

      await AuditLogger.log('device_revoked', {
        userId,
        deviceFingerprint: req.params.fingerprint,
        ip: req.ip,
      });

      res.json({ success: true, data: { message: 'Device revoked' } });
    } catch (err) { next(err); }
  });

  // в”Ђв”Ђв”Ђ 2FA / TOTP в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ

  const auth = authMiddleware();

  // Tepla Binary Shield status, device log, controlled rotation, and master-seed reset.
  router.get('/binary-shield/status', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.sub;
      await ensureBinaryShieldTables();

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
      await ensureBinaryShieldTables();

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

      await ensureBinaryShieldTables();
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

      const user = await userRepo.findById(userId);
      const issuer = 'Tepla';
      const otpauthUrl = `otpauth://totp/${issuer}:${user.username}?secret=${secret}&issuer=${issuer}&digits=6&period=30`;

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
      const { code } = req.body;
      if (!code) throw new ValidationError('TOTP code or backup code is required');

      const totpRow = await userRepo.getTotpSecret(userId);
      if (!totpRow || !totpRow.is_verified) {
        throw new ValidationError('2FA is not enabled');
      }

      // Try TOTP code first, then backup code
      const validTotp = verifyTotp(totpRow.secret, code);
      if (!validTotp) {
        const usedBackup = await userRepo.useBackupCode(userId, code);
        if (!usedBackup) throw new UnauthorizedError('Invalid code');
      }

      await userRepo.deleteTotp(userId);
      await AuditLogger.log('2fa_disabled', { userId, ip: req.ip });

      res.json({ success: true, data: { message: '2FA disabled' } });
    } catch (err) { next(err); }
  });

  // POST /api/auth/2fa/login вЂ” complete login with 2FA code (after challenge)
  router.post('/2fa/login', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { challengeId, code } = req.body;
      if (!challengeId || !code) throw new ValidationError('challengeId and code are required');

      const userId = await redis.get(`2fa:challenge:${challengeId}`);
      if (!userId) throw new UnauthorizedError('Invalid or expired 2FA challenge');

      const totpRow = await userRepo.getTotpSecret(userId);
      if (!totpRow || !totpRow.is_verified) {
        throw new ValidationError('2FA is not enabled');
      }

      const validTotp = verifyTotp(totpRow.secret, code);
      if (!validTotp) {
        const usedBackup = await userRepo.useBackupCode(userId, code);
        if (!usedBackup) {
          await SecurityMetrics.authFailure(rawRedis);
          throw new UnauthorizedError('Invalid 2FA code');
        }
      }

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
      const { userId, pin, deviceId } = req.body;
      if (!userId || !pin) throw new ValidationError('userId and pin are required');

      // Atomic rate limit: 5 per device per hour via Lua
      const rlKey = `pin_attempts:${deviceId || userId}`;
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
        await AuditLogger.log('pin_verify_failed', { userId, ip: req.ip });
        throw new UnauthorizedError('Invalid PIN');
      }

      await redis.del(rlKey);

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
  router.post('/pin/reset', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = req.body;
      if (!email) throw new ValidationError('Email is required');

      const user = await userRepo.findByEmail(email.toLowerCase().trim());
      if (!user) throw new UnauthorizedError('User not found');

      const challenge = await challengeService.createOtpChallenge(email, user.id);
      res.json({ success: true, data: { challengeId: challenge.challengeId, message: 'Check your email' } });
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

  // POST /api/auth/biometric/login
  router.post('/biometric/login', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, deviceId, signature } = req.body;
      if (!userId || !deviceId || !signature) throw new ValidationError('userId, deviceId, signature required');

      const device = await db.queryRow(
        `SELECT * FROM devices WHERE user_id = $1 AND device_id = $2 AND biometric_public_key IS NOT NULL`,
        [userId, deviceId]
      );
      if (!device) throw new UnauthorizedError('Biometric not registered for this device');

      // Verify Ed25519 signature: client signs a challenge (timestamp + deviceId + userId)
      const publicKeyBuf = Buffer.from(device.biometric_public_key, 'base64');
      const signatureBuf = Buffer.from(signature, 'base64');

      // The signed payload is deterministic: the client signs `${userId}:${deviceId}:${timestamp}`
      // We accept timestamps within a 5-minute window to prevent replay
      const now = Math.floor(Date.now() / 1000);
      let signatureValid = false;
      for (let ts = now - 300; ts <= now; ts++) {
        const challenge = Buffer.from(`${userId}:${deviceId}:${ts}`);
        if (crypto.verify('Ed25519', challenge, publicKeyBuf, signatureBuf)) {
          signatureValid = true;
          break;
        }
      }

      if (!signatureValid) {
        await AuditLogger.log('biometric_login_failed', { userId, deviceId, ip: req.ip, reason: 'invalid_signature' });
        throw new UnauthorizedError('Biometric signature verification failed');
      }

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
      if (!user) throw new UnauthorizedError('User not found');
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

      // Create/trust device
      const fingerprint = RiskEngine.generateFingerprint(req.headers as Record<string, string>);
      const deviceId = crypto.randomUUID();

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
      const { userId, deviceId, pinHash, biometricSignature } = req.body;
      if (!userId || !deviceId) throw new ValidationError('userId and deviceId required');

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
        const valid = await bcrypt.compare(pinHash, user.pin_hash);
        if (!valid) throw new UnauthorizedError('Invalid PIN');
      } else if (biometricSignature && device.biometric_public_key) {
        const pubKey = Buffer.from(device.biometric_public_key, 'base64');
        const sigBuf = Buffer.from(biometricSignature, 'base64');
        const now = Math.floor(Date.now() / 1000);
        let bioValid = false;
        for (let ts = now - 300; ts <= now; ts++) {
          const challenge = Buffer.from(`${userId}:${deviceId}:${ts}`);
          if (crypto.verify('Ed25519', challenge, pubKey, sigBuf)) { bioValid = true; break; }
        }
        if (!bioValid) throw new UnauthorizedError('Biometric signature verification failed');
      } else {
        throw new ValidationError('PIN or biometric required');
      }

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

// в”Ђв”Ђв”Ђ TOTP Helpers в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
function generateHOTP(secret: string, counter: number): string {
  const decodedSecret = base32Decode(secret);
  const buffer = Buffer.alloc(8);
  for (let i = 7; i >= 0; i--) {
    buffer[i] = counter & 0xff;
    counter = counter >> 8;
  }
  const hmac = crypto.createHmac('sha1', decodedSecret);
  hmac.update(buffer);
  const hmacResult = hmac.digest();
  const offset = hmacResult[hmacResult.length - 1] & 0xf;
  const code =
    ((hmacResult[offset] & 0x7f) << 24) |
    ((hmacResult[offset + 1] & 0xff) << 16) |
    ((hmacResult[offset + 2] & 0xff) << 8) |
    (hmacResult[offset + 3] & 0xff);
  return (code % 1_000_000).toString().padStart(6, '0');
}

function verifyTotp(secret: string, code: string, window: number = 1): boolean {
  const counter = Math.floor(Date.now() / 30_000);
  for (let i = -window; i <= window; i++) {
    if (generateHOTP(secret, counter + i) === code) return true;
  }
  return false;
}

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

function base32Decode(encoded: string): Buffer {
  const cleaned = encoded.replace(/=+$/, '').toUpperCase();
  let bits = 0;
  let value = 0;
  const output: number[] = [];
  for (const char of cleaned) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(output);
}

// в”Ђв”Ђв”Ђ Helpers в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
function normalizePhone(phone: string): string {
  return phone.replace(/[^\d+]/g, '').replace(/^8/, '+7');
}

function maskPhone(phone: string): string {
  if (phone.length < 6) return '***';
  return phone.slice(0, 4) + '****' + phone.slice(-2);
}

function mapUser(row: any) {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    phone: row.phone,
    email: row.email,
    avatarUrl: row.avatar_url,
    bio: row.bio,
    isOnline: row.is_online,
    isVerified: row.is_verified,
    language: row.language,
    publicKey: row.public_key,
    signingPublicKey: row.signing_public_key,
    createdAt: row.created_at,
  };
}

