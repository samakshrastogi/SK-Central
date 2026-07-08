import { Schema, model } from 'mongoose';

const systemMetricSchema = new Schema(
  {
    service: { type: String, required: true },
    status: { type: String, enum: ['healthy', 'degraded', 'offline', 'prepared'], required: true },
    cpu: { type: Number },
    ram: { type: Number },
    storage: { type: Number },
    latencyMs: { type: Number },
    metadata: { type: Schema.Types.Mixed }
  },
  { timestamps: true }
);

export const SystemMetricModel = model('SystemMetric', systemMetricSchema);
