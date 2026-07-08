import { Schema, model } from 'mongoose';

const searchHistorySchema = new Schema(
  {
    userId: { type: String, index: true },
    query: { type: String, required: true, index: true },
    filters: { type: Schema.Types.Mixed },
    resultCount: { type: Number, default: 0 }
  },
  { timestamps: true }
);

export const SearchHistoryModel = model('SearchHistory', searchHistorySchema);
