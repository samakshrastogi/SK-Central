import type { RequestHandler } from 'express';
import { StatusCodes } from 'http-status-codes';
import { ProjectService } from '@/services/project.service.js';
import { ok, created } from '@/utils/apiResponse.js';
import { createProjectSchema } from '@/validators/project.validator.js';

const service = new ProjectService();

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
  created(res, await service.createProject(input), 'Project created');
};

export const updateProject: RequestHandler = async (req, res) => {
  const slug = String(req.params.slug);
  const input = createProjectSchema.parse(req.body);
  const project = await service.updateProject(slug, input);
  if (!project) {
    res.status(StatusCodes.NOT_FOUND).json({ success: false, message: 'Project not found' });
    return;
  }
  ok(res, project, 'Project updated');
};

export const deleteProject: RequestHandler = async (req, res) => {
  const slug = String(req.params.slug);
  const project = await service.deleteProject(slug);
  if (!project) {
    res.status(StatusCodes.NOT_FOUND).json({ success: false, message: 'Project not found' });
    return;
  }
  ok(res, project, 'Project deleted');
};
