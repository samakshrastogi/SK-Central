import { env } from '@/config/env.js';
import { logger } from '@/utils/logger.js';

export interface RedisArchitecturePlaceholder {
  enabled: false;
  url: string;
  plannedUseCases: string[];
}

export function getRedisArchitecture(): RedisArchitecturePlaceholder {
  logger.info('Redis architecture placeholder initialized');
  return {
    enabled: false,
    url: env.REDIS_URL,
    plannedUseCases: ['query cache', 'rate limit store', 'sessions after auth', 'queues', 'socket presence']
  };
}
