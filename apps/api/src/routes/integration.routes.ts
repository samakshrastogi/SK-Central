import { Router } from 'express';
import { getSkQuizAdminAnalytics } from '@/controllers/integration.controller.js';
import { asyncHandler } from '@/utils/asyncHandler.js';

export const integrationRoutes = Router();

integrationRoutes.get('/sk-quiz/admin-analytics', asyncHandler(getSkQuizAdminAnalytics));
