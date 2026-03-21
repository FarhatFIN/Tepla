import { Request, Response, NextFunction } from 'express';
import { JwtPayload } from '@tepla/types';
import { RedisClient } from './redis';
declare global {
    namespace Express {
        interface Request {
            user?: JwtPayload;
            correlationId?: string;
        }
    }
}
export declare function authMiddleware(jwtSecret?: string): (req: Request, _res: Response, next: NextFunction) => void;
export declare function premiumMiddleware(redis?: RedisClient): (req: Request, _res: Response, next: NextFunction) => Promise<void>;
export declare function correlationMiddleware(): (req: Request, _res: Response, next: NextFunction) => void;
export declare function requestLoggerMiddleware(serviceName: string): (req: Request, res: Response, next: NextFunction) => void;
export declare function rateLimitMiddleware(redis: RedisClient, opts: {
    windowMs: number;
    maxRequests: number;
    keyPrefix?: string;
}): (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=middleware.d.ts.map