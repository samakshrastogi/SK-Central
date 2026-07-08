import { Router } from 'express';
import { createProject, getProject, listProjects } from '@/controllers/project.controller.js';
import { asyncHandler } from '@/utils/asyncHandler.js';

export const projectRoutes = Router();

projectRoutes.get('/', asyncHandler(listProjects));
projectRoutes.post('/', asyncHandler(createProject));
projectRoutes.get('/:slug', asyncHandler(getProject));
