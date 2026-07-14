import { Router } from 'express';
import { listNotifications, markAllRead } from '@/controllers/notification.controller.js';
import { asyncHandler } from '@/utils/asyncHandler.js';

export const notificationRoutes = Router();
notificationRoutes.get('/', asyncHandler(listNotifications));
notificationRoutes.patch('/read-all', asyncHandler(markAllRead));
