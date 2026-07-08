import type { RequestHandler } from 'express';
import { ok } from '@/utils/apiResponse.js';

export const getAdminOverview: RequestHandler = (_req, res) => {
  ok(res, {
    overview: {
      totalUsers: 42800,
      projects: 12,
      storage: '18.4 TB',
      apiCalls: 8900000,
      requests: 41200000,
      errors: '0.03%',
      growth: '+12.4%'
    },
    modules: {
      quizCoach: { users: 18200, quizzes: 4800, attempts: 124000, accuracy: 87, completion: 74 },
      skFlips: { videos: 5400, watchTimeHours: 18000, views: 2100000, storage: '9.2 TB' },
      community: { posts: 18700, comments: 92000, likes: 411000, reports: 37 },
      ai: { requests: 281000, models: 4, tokens: 92000000, averageResponseTimeMs: 1200 },
      infrastructure: { mongodb: 'healthy', redis: 'prepared', node: '20.x', api: '99.98%' }
    }
  });
};
