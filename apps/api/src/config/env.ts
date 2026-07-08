import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4002),
  CLIENT_ORIGIN: z.string().url().default('http://localhost:5475'),
  MONGODB_URI: z.string().default('mongodb://127.0.0.1:27017/sk-central'),
  JWT_SECRET: z.string().default('development-only'),
  REDIS_URL: z.string().default('redis://127.0.0.1:6379'),
  LOG_LEVEL: z.string().default('info'),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-1.5-flash'),
  SK_QUIZ_API_URL: z.string().url().default('http://localhost:4000/api'),
  SK_QUIZ_ADMIN_TOKEN: z.string().optional()
});

export const env = envSchema.parse(process.env);
