import type { RequestHandler } from 'express';
import { ok } from '@/utils/apiResponse.js';

let readAllAt: Date | null = null;

const liveNotifications = () => [
  {
    id: 'identity-analytics',
    title: 'Identity analytics updated',
    description: 'New user, login, visit, and active-time events are available.',
    group: 'System',
    unread: !readAllAt,
    targetUrl: '/analytics',
    createdAt: new Date().toLocaleString()
  },
  {
    id: 'applications-admin',
    title: 'Application controls ready',
    description: 'Manage app links, documentation, previews, and user access from Admin.',
    group: 'Launches',
    unread: !readAllAt,
    targetUrl: '/admin',
    createdAt: new Date().toLocaleString()
  }
];

export const listNotifications: RequestHandler = (_req, res) => {
  ok(res, liveNotifications());
};

export const markAllRead: RequestHandler = (_req, res) => {
  readAllAt = new Date();
  ok(res, { updated: liveNotifications().length }, 'Notifications marked read');
};
