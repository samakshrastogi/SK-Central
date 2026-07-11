import type { RequestHandler } from 'express';
import { ProjectModel } from '@/models/project.model.js';
import { IdentityUserModel } from '@/models/identity.model.js';
import { ok } from '@/utils/apiResponse.js';

export const getDashboard: RequestHandler = async (req, res) => {
  const [projects, users] = await Promise.all([ProjectModel.find().sort({ createdAt: -1 }).lean(), IdentityUserModel.countDocuments()]);
  ok(res, {
    user: req.user,
    stats: {
      projects: projects.length,
      users,
      requests: 0,
      launches: projects.filter((project) => project.status === 'Live').length
    },
    featuredProjects: projects.filter((project) => project.isFeatured)
  });
};
