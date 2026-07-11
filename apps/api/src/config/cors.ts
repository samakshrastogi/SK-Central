import type { CorsOptions } from 'cors';
import { env } from '@/config/env.js';

export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    const allowed = env.ALLOWED_ORIGINS.split(',').map((item) => item.trim()).filter(Boolean);
    if (!origin || allowed.includes(origin)) return callback(null, true);
    return callback(new Error(`Origin ${origin} is not allowed by SK Central CORS`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
};
