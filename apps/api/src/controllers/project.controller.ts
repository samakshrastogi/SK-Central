import type { Request, RequestHandler } from 'express';
import { StatusCodes } from 'http-status-codes';
import { ProjectService } from '@/services/project.service.js';
import { ok, created } from '@/utils/apiResponse.js';
import { createProjectSchema } from '@/validators/project.validator.js';
import { getSession } from '@/services/auth.service.js';
import { IdentityAuditLogModel } from '@/models/identity.model.js';

const service = new ProjectService();

const auditProjectChange = async (req: Request, action: string, project: Record<string, unknown>) => {
  const current = await getSession(req);
  if (!current) return;
  await IdentityAuditLogModel.create({
    actorUserId: current.user.id,
    action,
    metadata: { resourceType: 'application', resourceId: String(project._id ?? project.slug ?? ''), resourceName: String(project.name ?? project.slug ?? 'Application'), slug: project.slug }
  });
};

export const listProjects: RequestHandler = async (_req, res) => {
  ok(res, await service.listProjects());
};

export const getProject: RequestHandler = async (req, res) => {
  const slug = String(req.params.slug);
  const project = await service.getProject(slug);
  if (!project) {
    res.status(StatusCodes.NOT_FOUND).json({ success: false, message: 'Project not found' });
    return;
  }
  ok(res, project);
};

export const createProject: RequestHandler = async (req, res) => {
  const input = createProjectSchema.parse(req.body);
  const project = await service.createProject(input);
  await auditProjectChange(req, 'application_created', project as unknown as Record<string, unknown>);
  created(res, project, 'Project created');
};

export const updateProject: RequestHandler = async (req, res) => {
  const slug = String(req.params.slug);
  const input = createProjectSchema.parse(req.body);
  const project = await service.updateProject(slug, input);
  if (!project) {
    res.status(StatusCodes.NOT_FOUND).json({ success: false, message: 'Project not found' });
    return;
  }
  await auditProjectChange(req, 'application_updated', project as unknown as Record<string, unknown>);
  ok(res, project, 'Project updated');
};

export const deleteProject: RequestHandler = async (req, res) => {
  const slug = String(req.params.slug);
  const project = await service.deleteProject(slug);
  if (!project) {
    res.status(StatusCodes.NOT_FOUND).json({ success: false, message: 'Project not found' });
    return;
  }
  await auditProjectChange(req, 'application_deleted', project as unknown as Record<string, unknown>);
  ok(res, project, 'Project deleted');
};
