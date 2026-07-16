import type { RequestHandler } from 'express';
import mongoose from 'mongoose';
import { ProjectModel } from '@/models/project.model.js';
import { IdentityActivityModel, IdentitySessionModel, IdentityUserModel } from '@/models/identity.model.js';
import { ok } from '@/utils/apiResponse.js';
import { requireAdminReadAccess } from '@/services/auth.service.js';

export const getAdminOverview: RequestHandler = async (req, res) => {
  await requireAdminReadAccess(req);
  const [totalUsers, projects, activeSessions, loginEvents, activeTime] = await Promise.all([
    IdentityUserModel.countDocuments({ disabledAt: { $exists: false } }),
    ProjectModel.find().lean(),
    IdentitySessionModel.countDocuments({ revokedAt: { $exists: false }, expiresAt: { $gt: new Date() } }),
    IdentityActivityModel.countDocuments({ type: 'login' }),
    IdentityActivityModel.aggregate<{ totalSeconds: number }>([
      { $match: { type: 'active_time' } },
      { $group: { _id: null, totalSeconds: { $sum: '$durationSeconds' } } }
    ])
  ]);
  const liveProjects = projects.filter((project) => project.status === 'Live').length;

  ok(res, {
    overview: {
      totalUsers,
      projects: projects.length,
      liveProjects,
      activeSessions,
      loginEvents,
      activeTimeSeconds: activeTime[0]?.totalSeconds ?? 0
    },
    modules: {
      applications: projects.map((project) => ({
        id: String(project._id),
        name: project.name,
        slug: project.slug,
        status: project.status,
        version: project.version,
        category: project.category
      })),
      infrastructure: {
        mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        node: process.version,
        api: 'online'
      }
    }
  });
};
