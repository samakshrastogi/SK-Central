import type { RequestHandler } from 'express';
import mongoose from 'mongoose';
import { ok } from '@/utils/apiResponse.js';

export const health: RequestHandler = (_req, res) => {
  ok(res, {
    status: 'healthy',
    uptime: process.uptime(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'not-connected',
    timestamp: new Date().toISOString()
  });
};
