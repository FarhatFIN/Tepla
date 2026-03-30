import crypto from 'crypto';
import { NextFunction, Request, RequestHandler, Response, Router } from 'express';
import { KafkaProducer, RedisClient, authMiddleware } from '@tepla/common';
import { AuthRepository } from '../repositories/auth.repository';
import { AuthService, RequestContext } from '../services/auth.service';
import { DeliveryService } from '../services/delivery.service';
import { TokenService } from '../services/token.service';
import { VerificationCodeService } from '../services/verification-code.service';
import {
  parseEmailCodeVerificationInput,
  parseEmailLoginInput,
  parseEmailPasswordRegisterInput,
  parseLogoutInput,
  parsePasswordResetRequestInput,
  parsePasswordlessRegisterInput,
  parsePhoneCodeVerificationInput,
  parsePhoneLoginInput,
  parseRefreshSessionInput,
  parseUsernameAvailabilityInput,
} from '../validation/auth.validation';

export function authRouter(redis: RedisClient, kafka: KafkaProducer): Router {
  const router = Router();
  const auth = authMiddleware() as unknown as RequestHandler;
  const repository = new AuthRepository();
  const deliveryService = new DeliveryService();
  const tokenService = new TokenService();
  const verificationCodes = new VerificationCodeService(redis, deliveryService);
  const authService = new AuthService({
    repository,
    redis,
    kafka,
    tokenService,
    codeService: verificationCodes,
    deliveryService,
  });

  router.post('/login/phone', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await authService.requestPhoneLogin(parsePhoneLoginInput(req.body));
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  });

  router.post('/login/verify', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await authService.verifyPhoneLogin(
        parsePhoneCodeVerificationInput(req.body),
        buildRequestContext(req),
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  });

  router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await authService.registerPasswordless(
        parsePasswordlessRegisterInput(req.body),
        buildRequestContext(req),
      );
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  });

  router.post('/register/email', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await authService.registerWithEmailPassword(
        parseEmailPasswordRegisterInput(req.body),
        buildRequestContext(req),
      );
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  });

  router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await authService.loginWithPassword(parseEmailLoginInput(req.body));
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  });

  router.post('/verify-login', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await authService.verifyEmailLogin(
        parseEmailCodeVerificationInput(req.body),
        buildRequestContext(req),
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  });

  router.post('/verify-email', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await authService.verifyEmailRegistration(
        parseEmailCodeVerificationInput(req.body),
        buildRequestContext(req),
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  });

  router.post('/resend-code', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = parsePasswordResetRequestInput(req.body);
      const data = await authService.resendCode(email);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  });

  router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await authService.refreshSession(
        parseRefreshSessionInput(req.body),
        buildRequestContext(req),
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  });

  router.post('/logout', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await authService.logout(parseLogoutInput(req.body), req.user?.sub);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  });

  router.post('/logout/all', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await authService.logoutAll(req.user!.sub);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  });

  router.get('/sessions', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await authService.listSessions(req.user!.sub);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  });

  router.get('/devices', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await authService.listDevices(req.user!.sub);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  });

  router.delete('/devices/:sessionId', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessionId = typeof req.params.sessionId === 'string' ? req.params.sessionId : null;
      const data = await authService.logout({ refreshToken: null, sessionId }, req.user!.sub);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  });

  router.post('/pin/reset', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await authService.requestPasswordReset(parsePasswordResetRequestInput(req.body));
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  });

  router.get('/check-username/:username', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const username = parseUsernameAvailabilityInput(req.params.username);
      const data = await authService.checkUsernameAvailability(username);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  });

  router.get('/check-username', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const username = parseUsernameAvailabilityInput(req.query.username);
      const data = await authService.checkUsernameAvailability(username);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

function buildRequestContext(request: Request): RequestContext {
  return {
    correlationId: request.correlationId || crypto.randomUUID(),
    ipAddress: request.ip || 'unknown',
    userAgent: headerValue(request.headers['user-agent']) || 'unknown',
    deviceName: headerValue(request.headers['x-device-name']) || headerValue(request.headers['user-agent']) || 'unknown',
  };
}

function headerValue(value: string | string[] | undefined): string | null {
  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return null;
}
