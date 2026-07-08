import { Router } from 'express';
import { getAdminOverview } from '@/controllers/admin.controller.js';

export const adminRoutes = Router();
adminRoutes.get('/overview', getAdminOverview);
