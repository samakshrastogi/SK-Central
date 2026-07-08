import type { ErrorRequestHandler } from 'express';
import { env } from '@/config/env.js';
import { logger } from '@/utils/logger.js';

export const errorMiddleware: ErrorRequestHandler = (error, _req, res, _next) => {
  logger.error(error.message, error);
  res.status(error.statusCode ?? 500).json({
    success: false,
    message: error.message ?? 'Internal server error',
    stack: env.NODE_ENV === 'development' ? error.stack : undefined
  });
};
