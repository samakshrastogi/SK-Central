import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4002),
  TRUST_PROXY: z.string().default(process.env.NODE_ENV === 'production' ? '1' : 'false'),
  CLIENT_ORIGIN: z.string().url().default('http://localhost:5475'),
  ALLOWED_ORIGINS: z.string().default('http://localhost:5475,http://localhost:5474'),
  MONGODB_URI: z.string().default('mongodb://127.0.0.1:27017/sk-central'),
  DATABASE_NAME: z.string().default(process.env.NODE_ENV === 'production' ? 'central' : 'sk-central'),
  JWT_SECRET: z.string().default('development-only'),
  SSO_TOKEN_SECRET: z.string().default('sk-central-local-sso-secret-change-in-production'),
  SSO_COOKIE_NAME: z.string().default('sk_central_sid'),
  SSO_SESSION_DAYS: z.coerce.number().default(3650),
  SSO_APP_TOKEN_MINUTES: z.coerce.number().default(10),
  MAIL_FROM: z.string().default('SK Central <hello@sk-hub.in>'),
  RESEND_API_KEY: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(465),
  SMTP_TIMEOUT_MS: z.coerce.number().default(12_000),
  SMTP_SECURE: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
  SMTP_STARTTLS: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  OTP_TTL_MINUTES: z.coerce.number().default(10),
  REDIS_URL: z.string().default('redis://127.0.0.1:6379'),
  LOG_LEVEL: z.string().default('info'),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-1.5-flash'),
  SK_QUIZ_API_URL: z.string().url().default('http://localhost:4001/api'),
  SK_QUIZ_SERVICE_TOKEN: z.string().optional(),
  SK_QUIZ_ADMIN_TOKEN: z.string().optional()
});

export const env = envSchema.parse(process.env);
