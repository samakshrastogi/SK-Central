import type { RequestHandler } from 'express';
import { ok } from '@/utils/apiResponse.js';

const demoNotifications = [
  { id: 'n1', title: 'SK Quiz Coach 2.8 released', group: 'Launches', unread: true },
  { id: 'n2', title: 'Infrastructure watch', group: 'System', unread: true },
  { id: 'n3', title: 'Community moderation queue', group: 'Community', unread: false }
];

export const listNotifications: RequestHandler = (_req, res) => {
  ok(res, demoNotifications);
};

export const markAllRead: RequestHandler = (_req, res) => {
  ok(res, { updated: demoNotifications.length }, 'Notifications marked read');
};
