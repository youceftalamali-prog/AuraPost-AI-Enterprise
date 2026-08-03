import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { TimeoutError } from '../utils/timeout.js';
import { createVideoLogger } from '../utils/videoLogger.js';

const logger = createVideoLogger('ErrorHandler');

/**
 * Application error carrying an explicit HTTP status and machine-readable
 * code. Thrown by controllers/services for expected failure modes.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static badRequest(message: string, details?: unknown): ApiError {
    return new ApiError(400, 'BAD_REQUEST', message, details);
  }
  static unauthorized(message = 'Unauthorized'): ApiError {
    return new ApiError(401, 'UNAUTHORIZED', message);
  }
  static forbidden(message = 'Forbidden'): ApiError {
    return new ApiError(403, 'FORBIDDEN', message);
  }
  static notFound(message = 'Resource not found'): ApiError {
    return new ApiError(404, 'NOT_FOUND', message);
  }
  static conflict(message: string): ApiError {
    return new ApiError(409, 'CONFLICT', message);
  }
  static tooExpensive(message = 'Operation exceeds cost ceiling'): ApiError {
    return new ApiError(402, 'COST_LIMIT', message);
  }
  static upstream(message = 'Upstream provider error'): ApiError {
    return new ApiError(502, 'UPSTREAM_ERROR', message);
  }
}

/**
 * Central error handler. Maps every error type to a safe, structured JSON
 * response. Stack traces are only exposed in development.
 */
export function errorHandler(error: unknown, req: Request, res: Response, _next: NextFunction): void {
  const isDev = process.env.NODE_ENV === 'development';

  if (error instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: error.flatten(),
    });
    return;
  }

  if (error instanceof ApiError) {
    if (error.status >= 500) {
      logger.error('API error', error, { path: req.path, code: error.code });
    }
    res.status(error.status).json({
      success: false,
      error: error.message,
      code: error.code,
      details: isDev ? error.details : undefined,
    });
    return;
  }

  if (error instanceof TimeoutError) {
    logger.warn('Request timeout', { path: req.path, ms: error.ms });
    res.status(504).json({
      success: false,
      error: 'The operation timed out. Please retry.',
      code: 'TIMEOUT',
    });
    return;
  }

  const err = error instanceof Error ? error : new Error(String(error));
  logger.error('Unhandled error', err, { path: req.path, method: req.method });

  res.status(500).json({
    success: false,
    error: isDev ? err.message : 'Internal server error',
    code: 'INTERNAL_ERROR',
    ...(isDev && { stack: err.stack }),
  });
}

/** 404 handler for unmatched API routes. */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.path}`,
    code: 'NOT_FOUND',
  });
}