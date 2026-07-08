import { Schema, model } from 'mongoose';

const aiConversationSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    title: { type: String, default: 'New conversation' },
    messages: [
      {
        role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
        content: { type: String, required: true },
        metadata: { type: Schema.Types.Mixed },
        createdAt: { type: Date, default: Date.now }
      }
    ],
    model: { type: String, default: 'demo' },
    tokenUsage: { type: Number, default: 0 }
  },
  { timestamps: true }
);

export const AIConversationModel = model('AIConversation', aiConversationSchema);
