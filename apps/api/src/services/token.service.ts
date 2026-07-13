import crypto from 'node:crypto';
import { env } from '@/config/env.js';

const base64url = (value: Buffer | string) => Buffer.from(value).toString('base64url');

export interface AppTokenPayload {
  iss: 'sk-central';
  aud: string;
  sub: string;
  email: string;
  name: string;
  role: 'user' | 'student' | 'admin';
  permissions: string[];
  avatarUrl?: string;
  avatarInitials?: string;
  sid: string;
  iat: number;
  exp: number;
}

export function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function createOpaqueToken() {
  return crypto.randomBytes(48).toString('base64url');
}

export function signAppToken(payload: Omit<AppTokenPayload, 'iss' | 'iat' | 'exp'>) {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: AppTokenPayload = {
    ...payload,
    iss: 'sk-central',
    iat: now,
    exp: now + env.SSO_APP_TOKEN_MINUTES * 60
  };
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64url(JSON.stringify(fullPayload));
  const signature = crypto.createHmac('sha256', env.SSO_TOKEN_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

export function verifySignedToken(token: string) {
  const [header, body, signature] = token.split('.');
  if (!header || !body || !signature) return null;
  const expected = crypto.createHmac('sha256', env.SSO_TOKEN_SECRET).update(`${header}.${body}`).digest('base64url');
  if (signature.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as AppTokenPayload;
  if (payload.exp <= Math.floor(Date.now() / 1000)) return null;
  return payload;
}

export function hashPassword(password: string, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(password, salt, 120_000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

export function verifyPassword(password: string, salt: string, hash: string) {
  const next = hashPassword(password, salt).hash;
  return crypto.timingSafeEqual(Buffer.from(next, 'hex'), Buffer.from(hash, 'hex'));
}
