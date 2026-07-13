import type { CorsOptions } from 'cors';
import { env } from '@/config/env.js';

const normalizeOrigin = (value: string) => value.trim().replace(/\/$/, '');

const withHostnameAlias = (origin: string) => {
  try {
    const url = new URL(origin);
    if (!url.hostname.endsWith('sk-hub.in')) return [origin];
    const alias = new URL(origin);
    alias.hostname = url.hostname.startsWith('www.') ? url.hostname.slice(4) : `www.${url.hostname}`;
    return [origin, alias.origin];
  } catch {
    return [origin];
  }
};

const configuredOrigins = [env.CLIENT_ORIGIN, ...env.ALLOWED_ORIGINS.split(',')].map(normalizeOrigin).filter(Boolean);
const platformOrigins = ['https://sk-hub.in', 'https://www.sk-hub.in', 'https://quiz.sk-hub.in', 'https://www.quiz.sk-hub.in', 'https://mailpilot.sk-hub.in', 'https://www.mailpilot.sk-hub.in'];

export const allowedOrigins = [...new Set([...configuredOrigins.flatMap(withHostnameAlias), ...platformOrigins])];
export const isAllowedOrigin = (origin?: string) => !origin || allowedOrigins.includes(normalizeOrigin(origin));

export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) return callback(null, true);
    return callback(new Error(`Origin ${origin} is not allowed by SK Central CORS`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
};