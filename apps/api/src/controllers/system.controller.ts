import type { RequestHandler } from 'express';
import { getRedisArchitecture } from '@/database/redis.js';
import { ok } from '@/utils/apiResponse.js';

export const getSystem: RequestHandler = (_req, res) => {
  ok(res, {
    node: process.version,
    platform: process.platform,
    memory: process.memoryUsage(),
    redis: getRedisArchitecture(),
    services: [
      { name: 'MongoDB', status: 'healthy' },
      { name: 'API', status: 'healthy' },
      { name: 'Socket.IO', status: 'healthy' },
      { name: 'Workers', status: 'prepared' }
    ]
  });
};
