import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { env } from '@/config/env.js';
import { logger } from '@/utils/logger.js';

export const errorMiddleware: ErrorRequestHandler = (error, _req, res, _next) => {
  logger.error(error.message, error);

  if (error instanceof ZodError) {
    const details = error.flatten();
    const issueSummary = error.issues
      .map((issue) => `${issue.path.join('.') || 'request'}: ${issue.message}`)
      .join(', ');
    res.status(400).json({
      success: false,
      message: issueSummary || 'Please correct the highlighted fields.',
      details
    });
    return;
  }

  res.status(error.statusCode ?? (error.name === 'ValidationError' ? 400 : 500)).json({
    success: false,
    message: error.message ?? 'Internal server error',
    stack: env.NODE_ENV === 'development' ? error.stack : undefined
  });
};
