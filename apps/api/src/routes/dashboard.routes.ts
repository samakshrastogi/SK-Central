import { Router } from 'express';
import { getDashboard } from '@/controllers/dashboard.controller.js';

export const dashboardRoutes = Router();
dashboardRoutes.get('/', getDashboard);
