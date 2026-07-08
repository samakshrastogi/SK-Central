import { Schema, model } from 'mongoose';

const analyticsSchema = new Schema(
  {
    scope: { type: String, required: true, index: true },
    metric: { type: String, required: true },
    value: { type: Number, required: true },
    unit: { type: String },
    dimensions: { type: Map, of: String, default: {} },
    capturedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

export const AnalyticsModel = model('Analytics', analyticsSchema);
