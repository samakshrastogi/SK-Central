import { Router } from 'express';
import { createProject, deleteProject, getProject, listProjects, updateProject } from '@/controllers/project.controller.js';
import { asyncHandler } from '@/utils/asyncHandler.js';

export const projectRoutes = Router();

projectRoutes.get('/', asyncHandler(listProjects));
projectRoutes.post('/', asyncHandler(createProject));
projectRoutes.get('/:slug', asyncHandler(getProject));
projectRoutes.put('/:slug', asyncHandler(updateProject));
projectRoutes.delete('/:slug', asyncHandler(deleteProject));
