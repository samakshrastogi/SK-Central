import { Router } from 'express';
import { getAnalyticsOverview } from '@/controllers/analytics.controller.js';

export const analyticsRoutes = Router();
analyticsRoutes.get('/overview', getAnalyticsOverview);
