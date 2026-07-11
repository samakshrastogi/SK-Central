import { Router } from 'express';
import { getAdminOverview } from '@/controllers/admin.controller.js';
import { asyncHandler } from '@/utils/asyncHandler.js';

export const adminRoutes = Router();
adminRoutes.get('/overview', asyncHandler(getAdminOverview));
