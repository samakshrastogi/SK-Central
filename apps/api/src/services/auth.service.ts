import type { Request, Response } from 'express';
import { env } from '@/config/env.js';
import { IdentityActivityModel, IdentityAuditLogModel, IdentityOtpModel, IdentitySessionModel, IdentityUserModel } from '@/models/identity.model.js';
import { sendOtpEmail } from '@/services/mail.service.js';
import { createOpaqueToken, hashPassword, hashToken, signAppToken, verifyPassword } from '@/services/token.service.js';

const publicUserFields = '_id email name role permissions avatarUrl avatarInitials disabledAt createdAt';
type IdentityUserDocument = {
  _id: unknown;
  email: string;
  name: string;
  role: 'user' | 'admin' | 'student';
  permissions?: string[];
  avatarUrl?: string | null;
  avatarInitials?: string | null;
  disabledAt?: Date | null;
  lastLoginAt?: Date | null;
  save: () => Promise<unknown>;
};

const sharedCookieDomain = env.SSO_COOKIE_DOMAIN ?? (env.NODE_ENV === 'production' ? '.sk-hub.in' : undefined);
const sharedCookieName = `${env.SSO_COOKIE_NAME}_shared`;

const cookieBaseOptions = () => ({
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: env.NODE_ENV === 'production' ? ('none' as const) : ('lax' as const),
  path: '/'
});

const cookieOptions = () => ({
  ...cookieBaseOptions(),
  maxAge: env.SSO_SESSION_DAYS * 24 * 60 * 60 * 1000
});

function getCookie(req: Request, name: string) {
  const header = req.headers.cookie ?? '';
  return header
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

const normalizeEmail = (email: string) => email.trim().toLowerCase();
const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));
const dateKey = (date = new Date()) => date.toISOString().slice(0, 10);
const hourKey = (date = new Date()) => date.toISOString().slice(0, 13);

async function recordActivity(userId: unknown, platform: string, type: 'login' | 'visit' | 'active_time', durationSeconds = 0, metadata?: Record<string, unknown>) {
  const now = new Date();
  await IdentityActivityModel.create({
    userId,
    platform,
    type,
    dateKey: dateKey(now),
    hourKey: hourKey(now),
    durationSeconds,
    metadata
  });
}

async function issueOtp(email: string, purpose: 'verify_email' | 'reset_password') {
  const otp = generateOtp();
  const hashed = hashPassword(otp);
  await IdentityOtpModel.updateMany({ email, purpose, consumedAt: { $exists: false } }, { consumedAt: new Date() });
  await IdentityOtpModel.create({
    email,
    purpose,
    otpHash: hashed.hash,
    otpSalt: hashed.salt,
    expiresAt: new Date(Date.now() + env.OTP_TTL_MINUTES * 60 * 1000)
  });
  await sendOtpEmail({ to: email, otp, purpose });
}

async function verifyOtp(email: string, purpose: 'verify_email' | 'reset_password', otp: string) {
  const record = await IdentityOtpModel.findOne({
    email,
    purpose,
    consumedAt: { $exists: false },
    expiresAt: { $gt: new Date() }
  }).sort({ createdAt: -1 });
  if (!record) {
    const error = new Error('OTP expired or not found') as Error & { statusCode?: number };
    error.statusCode = 400;
    throw error;
  }
  if (record.attempts >= 5) {
    const error = new Error('Too many OTP attempts. Request a fresh OTP.') as Error & { statusCode?: number };
    error.statusCode = 429;
    throw error;
  }
  if (!verifyPassword(otp, record.otpSalt, record.otpHash)) {
    record.attempts += 1;
    await record.save();
    const error = new Error('Invalid OTP') as Error & { statusCode?: number };
    error.statusCode = 400;
    throw error;
  }
  record.consumedAt = new Date();
  await record.save();
}

async function establishSession(user: IdentityUserDocument | null, req: Request, res: Response) {
  if (!user) throw new Error('Account not found');
  const rawSession = createOpaqueToken();
  const expiresAt = new Date(Date.now() + env.SSO_SESSION_DAYS * 24 * 60 * 60 * 1000);
  await IdentitySessionModel.create({
    userId: user._id,
    sessionHash: hashToken(rawSession),
    userAgent: req.headers['user-agent'],
    ipAddress: req.ip,
    expiresAt,
    lastSeenAt: new Date()
  });
  const previousLoginAt = user.lastLoginAt;
  user.lastLoginAt = new Date();
  await user.save();
  if (!previousLoginAt || Date.now() - new Date(previousLoginAt).getTime() > 60 * 60 * 1000) {
    await recordActivity(user._id, 'sk-central', 'login', 0, { userAgent: req.headers['user-agent'], ipAddress: req.ip });
  }
  res.cookie(env.SSO_COOKIE_NAME, rawSession, cookieOptions());
  if (sharedCookieDomain) res.cookie(sharedCookieName, rawSession, { ...cookieOptions(), domain: sharedCookieDomain });
  return getPublicUser(user);
}

export async function loginWithPassword(input: { email: string; password: string }, req: Request, res: Response) {
  if (!input?.email || !input?.password) {
    const error = new Error('Email and password are required') as Error & { statusCode?: number };
    error.statusCode = 400;
    throw error;
  }
  const user = await IdentityUserModel.findOne({ email: normalizeEmail(input.email) }).select('+passwordHash +passwordSalt');
  if (!user || user.disabledAt || !verifyPassword(input.password, user.passwordSalt, user.passwordHash)) {
    const error = new Error('Invalid email or password') as Error & { statusCode?: number };
    error.statusCode = 401;
    throw error;
  }
  if (!user.emailVerifiedAt) {
    await issueOtp(user.email, 'verify_email');
    const error = new Error('Email verification required. A new OTP was sent.') as Error & { statusCode?: number };
    error.statusCode = 403;
    throw error;
  }
  return establishSession(user, req, res);
}

export async function registerIdentity(input: { name: string; email: string; password: string; confirmPassword?: string }) {
  if (!input?.name || !input?.email || !input?.password || input.password.length < 8) {
    const error = new Error('Name, valid email, and an 8+ character password are required') as Error & { statusCode?: number };
    error.statusCode = 400;
    throw error;
  }
  if (input.password !== input.confirmPassword) {
    const error = new Error('Password confirmation does not match') as Error & { statusCode?: number };
    error.statusCode = 400;
    throw error;
  }
  const email = normalizeEmail(input.email);
  const existing = await IdentityUserModel.findOne({ email });
  if (existing?.emailVerifiedAt) {
    const error = new Error('Email is already registered') as Error & { statusCode?: number };
    error.statusCode = 409;
    throw error;
  }
  const password = hashPassword(input.password);
  if (existing) {
    existing.name = input.name;
    existing.passwordHash = password.hash;
    existing.passwordSalt = password.salt;
    await existing.save();
  } else {
    await IdentityUserModel.create({
      email,
      name: input.name,
      role: 'user',
      permissions: ['apps:read'],
      passwordHash: password.hash,
      passwordSalt: password.salt
    });
  }
  await issueOtp(email, 'verify_email');
  return { email, requiresVerification: true };
}

export async function verifyIdentityEmail(input: { email: string; otp: string }, req: Request, res: Response) {
  const email = normalizeEmail(input.email);
  await verifyOtp(email, 'verify_email', input.otp);
  const user = await IdentityUserModel.findOne({ email }).select('+passwordHash +passwordSalt');
  if (!user) {
    const error = new Error('Account not found') as Error & { statusCode?: number };
    error.statusCode = 404;
    throw error;
  }
  user.emailVerifiedAt = user.emailVerifiedAt ?? new Date();
  await user.save();
  return establishSession(user, req, res);
}

export async function resendVerificationOtp(input: { email: string }) {
  const email = normalizeEmail(input.email);
  const user = await IdentityUserModel.findOne({ email });
  if (user && !user.emailVerifiedAt) await issueOtp(email, 'verify_email');
  return { sent: true };
}

export async function forgotPassword(input: { email: string }) {
  const email = normalizeEmail(input.email);
  const user = await IdentityUserModel.findOne({ email });
  if (user) await issueOtp(email, 'reset_password');
  return { sent: true };
}

export async function resetPassword(input: { email: string; otp: string; password: string; confirmPassword?: string }) {
  if (!input?.password || input.password.length < 8) {
    const error = new Error('Password must be at least 8 characters') as Error & { statusCode?: number };
    error.statusCode = 400;
    throw error;
  }
  if (input.password !== input.confirmPassword) {
    const error = new Error('Password confirmation does not match') as Error & { statusCode?: number };
    error.statusCode = 400;
    throw error;
  }
  const email = normalizeEmail(input.email);
  await verifyOtp(email, 'reset_password', input.otp);
  const user = await IdentityUserModel.findOne({ email });
  if (!user) {
    const error = new Error('Account not found') as Error & { statusCode?: number };
    error.statusCode = 404;
    throw error;
  }
  const password = hashPassword(input.password);
  user.passwordHash = password.hash;
  user.passwordSalt = password.salt;
  user.emailVerifiedAt = user.emailVerifiedAt ?? new Date();
  await user.save();
  return { updated: true };
}

export async function getSession(req: Request) {
  const rawSession = getCookie(req, env.SSO_COOKIE_NAME) ?? getCookie(req, sharedCookieName);
  if (!rawSession) return null;
  const session = await IdentitySessionModel.findOne({
    sessionHash: hashToken(rawSession),
    revokedAt: { $exists: false },
    expiresAt: { $gt: new Date() }
  }).populate('userId', publicUserFields);
  if (!session) return null;
  session.lastSeenAt = new Date();
  await session.save();
  const user = session.userId as unknown as { _id: unknown; email: string; name: string; role: 'user' | 'admin' | 'student'; permissions?: string[]; avatarUrl?: string | null; avatarInitials?: string | null; disabledAt?: Date; createdAt?: Date };
  if (user.disabledAt) return null;
  return { session, user: getPublicUser(user) };
}

export async function logout(req: Request, res: Response, global = false) {
  const current = await getSession(req);
  if (current) {
    if (global) await IdentitySessionModel.updateMany({ userId: current.user.id }, { revokedAt: new Date() });
    else current.session.revokedAt = new Date();
    await current.session.save();
  }
  res.clearCookie(env.SSO_COOKIE_NAME, cookieBaseOptions());
  if (sharedCookieDomain) res.clearCookie(sharedCookieName, { ...cookieBaseOptions(), domain: sharedCookieDomain });
}

export async function listSessions(req: Request) {
  const current = await getSession(req);
  if (!current) return [];
  return IdentitySessionModel.find({ userId: current.user.id }).sort({ lastSeenAt: -1 }).limit(25).lean();
}

export async function createAppToken(req: Request, appId: string) {
  const current = await getSession(req);
  if (!current) return null;
  await recordActivity(current.user.id, appId, 'visit', 0, { source: 'app-token' });
  const appRole = appId === 'sk-quiz' && current.user.role === 'user' ? 'student' : current.user.role;
  return {
    token: signAppToken({
      aud: appId,
      sub: current.user.id,
      email: current.user.email,
      name: current.user.name,
      role: appRole,
      permissions: current.user.permissions,
      sid: String(current.session._id)
    }),
    user: current.user
  };
}

export async function recordUsage(req: Request, input: { platform?: string; durationSeconds?: number; type?: 'visit' | 'active_time' }) {
  const current = await getSession(req);
  if (!current) return null;
  await recordActivity(current.user.id, input.platform ?? 'sk-central', input.type ?? 'active_time', Math.max(0, Number(input.durationSeconds ?? 0)));
  return { recorded: true };
}

export async function updateIdentityProfile(req: Request, input: { name?: string; avatarUrl?: string | null; avatarInitials?: string | null }) {
  const current = await getSession(req);
  if (!current) return null;
  const user = await IdentityUserModel.findById(current.user.id);
  if (!user) return null;

  const nextName = typeof input.name === 'string' ? input.name.trim().slice(0, 80) : '';
  if (nextName.length >= 2) user.name = nextName;
  if (typeof input.avatarInitials === 'string') user.avatarInitials = input.avatarInitials.trim().replace(/[^a-z0-9]/gi, '').slice(0, 3).toUpperCase();
  if (typeof input.avatarUrl === 'string') user.avatarUrl = input.avatarUrl.length <= 250_000 ? input.avatarUrl : '';

  await user.save();
  return getPublicUser(user);
}

export async function getIdentityAnalytics(req: Request) {
  const current = await getSession(req);
  if (!current || current.user.role !== 'admin') {
    const error = new Error('Admin access required') as Error & { statusCode?: number };
    error.statusCode = 403;
    throw error;
  }
  const users = await IdentityUserModel.find().select('_id email name role disabledAt lastLoginAt createdAt').sort({ createdAt: 1 }).lean();
  const activities = await IdentityActivityModel.find().populate('userId', '_id email name').sort({ createdAt: -1 }).limit(5000).lean();
  const audits = await IdentityAuditLogModel.find().populate('actorUserId', 'name email').populate('targetUserId', 'name email').sort({ createdAt: -1 }).limit(100).lean();
  return { users, activities, audits };
}

export async function setUserRole(req: Request, input: { userId: string; role: 'user' | 'admin' }) {
  const current = await getSession(req);
  if (!current || current.user.role !== 'admin') {
    const error = new Error('Admin access required') as Error & { statusCode?: number };
    error.statusCode = 403;
    throw error;
  }
  const user = await IdentityUserModel.findById(input.userId);
  if (!user) {
    const error = new Error('User not found') as Error & { statusCode?: number };
    error.statusCode = 404;
    throw error;
  }
  const previousRole = user.role;
  user.role = input.role;
  user.permissions = input.role === 'user' ? ['apps:read'] : ['apps:read', 'apps:write', 'analytics:read', 'sessions:manage', 'users:manage'];
  await user.save();
  await IdentityAuditLogModel.create({ actorUserId: current.user.id, targetUserId: user._id, action: 'role_changed', metadata: { previousRole, nextRole: input.role } });
  return getPublicUser(user);
}

export async function revokeUser(req: Request, input: { userId: string }) {
  const current = await getSession(req);
  if (!current || current.user.role !== 'admin') {
    const error = new Error('Admin access required') as Error & { statusCode?: number };
    error.statusCode = 403;
    throw error;
  }
  await IdentitySessionModel.updateMany({ userId: input.userId }, { revokedAt: new Date() });
  await IdentityAuditLogModel.create({ actorUserId: current.user.id, targetUserId: input.userId, action: 'user_sessions_revoked' });
  return { revoked: true };
}

export async function getRememberedIdentityRecords(input: { emails?: string[] }) {
  const emails = [...new Set((input.emails ?? []).map(normalizeEmail).filter(Boolean))];
  if (!emails.length) return [];
  const users = await IdentityUserModel.find({ email: { $in: emails }, disabledAt: { $exists: false } }).select('_id email name role permissions avatarUrl avatarInitials').lean();
  return users.map((user) => ({
    id: String(user._id),
    email: user.email,
    name: user.name,
    role: user.role,
    permissions: user.permissions ?? [],
    avatarUrl: user.avatarUrl ?? '',
    avatarInitials: user.avatarInitials ?? ''
  }));
}

export function getPublicUser(user: { _id: unknown; email: string; name: string; role: 'user' | 'admin' | 'student'; permissions?: string[]; avatarUrl?: string | null; avatarInitials?: string | null; createdAt?: Date }) {
  return {
    id: String(user._id),
    email: user.email,
    name: user.name,
    role: user.role === 'student' ? 'user' : user.role,
    permissions: user.permissions ?? [],
    avatarUrl: user.avatarUrl ?? '',
    avatarInitials: user.avatarInitials ?? '',
    createdAt: user.createdAt?.toISOString()
  };
}

