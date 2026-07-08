import { Router } from 'express';
import { adminRoutes } from '@/routes/admin.routes.js';
import { aiRoutes } from '@/routes/ai.routes.js';
import { analyticsRoutes } from '@/routes/analytics.routes.js';
import { dashboardRoutes } from '@/routes/dashboard.routes.js';
import { healthRoutes } from '@/routes/health.routes.js';
import { integrationRoutes } from '@/routes/integration.routes.js';
import { notificationRoutes } from '@/routes/notification.routes.js';
import { projectRoutes } from '@/routes/project.routes.js';
import { searchRoutes } from '@/routes/search.routes.js';
import { systemRoutes } from '@/routes/system.routes.js';

export const apiRoutes = Router();

apiRoutes.use('/health', healthRoutes);
apiRoutes.use('/integrations', integrationRoutes);
apiRoutes.use('/dashboard', dashboardRoutes);
apiRoutes.use('/projects', projectRoutes);
apiRoutes.use('/notifications', notificationRoutes);
apiRoutes.use('/search', searchRoutes);
apiRoutes.use('/analytics', analyticsRoutes);
apiRoutes.use('/ai', aiRoutes);
apiRoutes.use('/admin', adminRoutes);
apiRoutes.use('/system', systemRoutes);
