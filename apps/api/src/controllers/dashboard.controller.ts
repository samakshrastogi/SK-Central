import type { RequestHandler } from 'express';
import { demoProjects } from '@/constants/demoData.js';
import { ok } from '@/utils/apiResponse.js';

export const getDashboard: RequestHandler = (req, res) => {
  ok(res, {
    user: req.user,
    stats: {
      projects: 12,
      users: 42800,
      requests: 8900000,
      launches: 27
    },
    featuredProjects: demoProjects
  });
};
