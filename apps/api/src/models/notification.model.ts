import { Schema, model } from 'mongoose';

const notificationSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    group: { type: String, enum: ['Launches', 'System', 'Community', 'AI'], required: true },
    unread: { type: Boolean, default: true },
    userId: { type: String, index: true },
    metadata: { type: Schema.Types.Mixed }
  },
  { timestamps: true }
);

export const NotificationModel = model('Notification', notificationSchema);
