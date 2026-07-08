import { Schema, model } from 'mongoose';

const activitySchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    type: { type: String, enum: ['launch', 'update', 'system', 'community'], required: true },
    actorId: { type: String },
    projectSlug: { type: String },
    metadata: { type: Schema.Types.Mixed }
  },
  { timestamps: true }
);

export const ActivityModel = model('Activity', activitySchema);
