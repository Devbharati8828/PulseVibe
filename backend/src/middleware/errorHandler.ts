import type { Request, Response, NextFunction } from 'express';
import pino from 'pino';

const logger = pino({ level: process.env.LOG_LEVEL ?? 'info' });

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = err.statusCode ?? 500;
  const code = err.code ?? 'INTERNAL_ERROR';

  // Log full error internally — never expose stack to client
  logger.error({ err, url: req.url, method: req.method }, 'Unhandled error');

  res.status(statusCode).json({
    error: statusCode === 500 ? 'An unexpected error occurred' : err.message,
    code,
  });
}
