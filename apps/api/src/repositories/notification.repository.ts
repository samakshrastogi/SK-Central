import { NotificationModel } from '@/models/notification.model.js';

export class NotificationRepository {
  async findForUser(userId: string) {
    return NotificationModel.find({ $or: [{ userId }, { userId: { $exists: false } }] }).sort({ createdAt: -1 }).lean();
  }

  async markAllRead(userId: string) {
    return NotificationModel.updateMany({ userId }, { unread: false });
  }
}
