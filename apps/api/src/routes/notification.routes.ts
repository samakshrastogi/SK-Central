import { Router } from 'express';
import { listNotifications, markAllRead } from '@/controllers/notification.controller.js';

export const notificationRoutes = Router();
notificationRoutes.get('/', listNotifications);
notificationRoutes.patch('/read-all', markAllRead);
