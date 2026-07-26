import { Request, Response, NextFunction } from 'express';
import { createLogger } from './logger';

const logger = createLogger('error-handler');

const STATUS_CODES: Record<number, string> = {
  400: 'VALIDATION_ERROR',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  413: 'PAYLOAD_TOO_LARGE',
  415: 'UNSUPPORTED_MEDIA_TYPE',
  429: 'RATE_LIMIT',
  503: 'SERVICE_UNAVAILABLE',
};

function defaultCodeForStatus(statusCode: number): string {
  return STATUS_CODES[statusCode] || (statusCode >= 500 ? 'INTERNAL_ERROR' : 'ERROR');
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  // `code` is optional: several call sites (calls module, media routes) always
  // constructed AppError with just a message and a status, which does not
  // typecheck against a required parameter and produced `code: undefined` in
  // the JSON body at runtime. Derive a sane default from the status instead.
  constructor(message: string, statusCode: number, code?: string, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.code = code || defaultCodeForStatus(statusCode);
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(
      id ? `${resource} with id '${id}' not found` : `${resource} not found`,
      404,
      'NOT_FOUND'
    );
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class ValidationError extends AppError {
  public readonly details: unknown;
  constructor(message: string, details?: unknown) {
    super(message, 400, 'VALIDATION_ERROR');
    this.details = details;
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfter?: number) {
    super(`Rate limit exceeded${retryAfter ? `. Retry after ${retryAfter}s` : ''}`, 429, 'RATE_LIMIT');
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(service: string) {
    super(`Service '${service}' is temporarily unavailable`, 503, 'SERVICE_UNAVAILABLE');
  }
}

/**
 * Postgres error codes that are caused by bad client input rather than by a
 * server fault. Without this mapping a request like `/api/polls/not-a-uuid`
 * raises `22P02` deep inside pg and surfaces as an opaque HTTP 500 (M-04).
 */
const PG_CLIENT_ERRORS: Record<string, { status: number; code: string; message: string }> = {
  '22P02': { status: 400, code: 'INVALID_INPUT', message: 'Malformed identifier or value' },
  '22001': { status: 400, code: 'VALUE_TOO_LONG', message: 'A submitted value is too long' },
  '23503': { status: 400, code: 'INVALID_REFERENCE', message: 'Referenced resource does not exist' },
  '23505': { status: 409, code: 'CONFLICT', message: 'Resource already exists' },
  '23514': { status: 400, code: 'CONSTRAINT_VIOLATION', message: 'Value violates a constraint' },
};

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  const pgCode = (err as { code?: string }).code;
  const mapped = typeof pgCode === 'string' ? PG_CLIENT_ERRORS[pgCode] : undefined;
  if (mapped) {
    res.status(mapped.status).json({
      success: false,
      error: { code: mapped.code, message: mapped.message },
    });
    return;
  }

  if (err instanceof AppError) {
    if (!err.isOperational) {
      logger.error('Non-operational error', { error: err.message, stack: err.stack });
    }
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err instanceof ValidationError && err.details ? { details: err.details } : {}),
      },
    });
    return;
  }

  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  });
}
