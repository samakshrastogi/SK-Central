import mongoose from 'mongoose';
import { env } from '@/config/env.js';
import { logger } from '@/utils/logger.js';

export async function connectMongo() {
  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(env.MONGODB_URI, { dbName: env.DATABASE_NAME });
    logger.info(`MongoDB connected to database ${env.DATABASE_NAME}`);
  } catch (error) {
    logger.error('MongoDB connection failed', error);
    if (env.NODE_ENV === 'production') {
      throw error;
    }
  }
}
