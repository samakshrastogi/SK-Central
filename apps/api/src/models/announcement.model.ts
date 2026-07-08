import { Schema, model } from 'mongoose';

const announcementSchema = new Schema(
  {
    title: { type: String, required: true },
    body: { type: String, required: true },
    audience: { type: String, enum: ['all', 'admins', 'project'], default: 'all' },
    projectSlug: { type: String },
    publishedAt: { type: Date },
    authorId: { type: String }
  },
  { timestamps: true }
);

export const AnnouncementModel = model('Announcement', announcementSchema);
