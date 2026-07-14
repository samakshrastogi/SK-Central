import { create } from 'zustand';
import { api } from '@/services/api';
import type { NotificationItem } from '@/types';

interface NotificationState {
  items: NotificationItem[];
  load: () => Promise<void>;
  markAllRead: () => Promise<void>;
}

let notificationLoadPromise: Promise<void> | null = null;
let lastNotificationLoadAt = 0;
const notificationRefreshMs = 60_000;

const normalize = (item: Partial<NotificationItem>, index: number): NotificationItem => ({
  id: item.id ?? `notification-${index}`,
  title: item.title ?? 'Platform update',
  description: item.description ?? 'A new SK Central update is available.',
  group: item.group ?? 'System',
  unread: Boolean(item.unread),
  createdAt: item.createdAt ?? 'Just now',
  targetUrl: item.targetUrl ?? '/'
});

export const useNotificationStore = create<NotificationState>((set, get) => ({
  items: [],
  load: async () => {
    try {
      const response = await api.get('/notifications');
      set({ items: (response.data.data as Partial<NotificationItem>[]).map(normalize) });
    } catch {
      set({ items: [] });
    }
  },
  markAllRead: async () => {
    await api.patch('/notifications/read-all');
    set({ items: get().items.map((item) => ({ ...item, unread: false })) });
  }
}));


