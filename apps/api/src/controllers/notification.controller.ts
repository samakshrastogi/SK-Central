import type { RequestHandler } from 'express';
import { NotificationModel } from '@/models/notification.model.js';
import { getSession } from '@/services/auth.service.js';
import { ok } from '@/utils/apiResponse.js';

const visibleNotificationFilter = (userId: string) => ({
  $or: [{ userId }, { userId: { $exists: false } }]
});

export const listNotifications: RequestHandler = async (req, res) => {
  const current = await getSession(req);
  if (!current) {
    ok(res, []);
    return;
  }

  const userId = current.user.id;
  const notifications = await NotificationModel.find(visibleNotificationFilter(userId))
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  ok(res, notifications.map((notification) => ({
    id: String(notification._id),
    title: notification.title,
    description: notification.description,
    group: notification.group,
    unread: !notification.readBy?.includes(userId),
    targetUrl: typeof notification.metadata?.targetUrl === 'string' ? notification.metadata.targetUrl : '/admin',
    createdAt: notification.createdAt.toISOString()
  })));
};

export const markAllRead: RequestHandler = async (req, res) => {
  const current = await getSession(req);
  if (!current) {
    ok(res, { updated: 0 }, 'Notifications marked read');
    return;
  }

  const result = await NotificationModel.updateMany(
    visibleNotificationFilter(current.user.id),
    { $addToSet: { readBy: current.user.id } }
  );
  ok(res, { updated: result.modifiedCount }, 'Notifications marked read');
};
