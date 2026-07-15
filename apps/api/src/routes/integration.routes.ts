import { Router } from 'express';
import { getConnectedApplicationAnalytics, getSkQuizAdminAnalytics } from '@/controllers/integration.controller.js';
import { asyncHandler } from '@/utils/asyncHandler.js';

export const integrationRoutes = Router();

integrationRoutes.get('/sk-quiz/admin-analytics', asyncHandler(getSkQuizAdminAnalytics));
integrationRoutes.get("/:application/admin-analytics", asyncHandler(getConnectedApplicationAnalytics));
