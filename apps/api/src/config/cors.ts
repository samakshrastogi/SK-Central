import type { CorsOptions } from 'cors';
import { env } from '@/config/env.js';

export const corsOptions: CorsOptions = {
  origin: env.CLIENT_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
};
