import { Schema, model } from 'mongoose';

const notificationSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    group: { type: String, enum: ['Launches', 'System', 'Community', 'AI'], required: true },
    userId: { type: String, index: true },
    readBy: [{ type: String }],
    metadata: { type: Schema.Types.Mixed }
  },
  { timestamps: true }
);

export const NotificationModel = model('Notification', notificationSchema);
