import { Router } from 'express';
import { getDashboard } from '@/controllers/dashboard.controller.js';
import { asyncHandler } from '@/utils/asyncHandler.js';

export const dashboardRoutes = Router();
dashboardRoutes.get('/', asyncHandler(getDashboard));
