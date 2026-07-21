import type { RequestHandler } from 'express';
import { createAppToken, forgotPassword, getIdentityAnalytics, getRememberedIdentityRecords, getSession, listSessions, loginWithPassword, loginWithRememberedBrowser, logout, recordUsage, registerIdentity, resendVerificationOtp, resetPassword, revokeUser, setUserRole, updateIdentityProfile, verifyIdentityEmail, verifyPasswordResetOtp } from '@/services/auth.service.js';
import { verifySignedToken } from '@/services/token.service.js';
import { ok } from '@/utils/apiResponse.js';

const requireCurrentSession = async (req: Parameters<RequestHandler>[0]) => {
  const current = await getSession(req);
  if (!current) {
    const error = new Error('Authentication required') as Error & { statusCode?: number };
    error.statusCode = 401;
    throw error;
  }
  return current;
};

export const login: RequestHandler = async (req, res, next) => {
  try {
    const result = await loginWithPassword(req.body, req, res);
    ok(res, result, 'Logged in');
  } catch (error) {
    next(error);
  }
};

export const rememberedLogin: RequestHandler = async (req, res, next) => {
  try {
    const user = await loginWithRememberedBrowser(req.body, req, res);
    ok(res, { user }, 'Remembered browser signed in');
  } catch (error) {
    next(error);
  }
};

export const register: RequestHandler = async (req, res, next) => {
  try {
    ok(res, await registerIdentity(req.body), 'Verification OTP sent');
  } catch (error) {
    next(error);
  }
};

export const verifyEmail: RequestHandler = async (req, res, next) => {
  try {
    const result = await verifyIdentityEmail(req.body, req, res);
    ok(res, result, 'Email verified');
  } catch (error) {
    next(error);
  }
};

export const resendVerification: RequestHandler = async (req, res, next) => {
  try {
    ok(res, await resendVerificationOtp(req.body), 'Verification OTP sent if needed');
  } catch (error) {
    next(error);
  }
};

export const forgot: RequestHandler = async (req, res, next) => {
  try {
    ok(res, await forgotPassword(req.body), 'Password reset OTP sent if the account exists');
  } catch (error) {
    next(error);
  }
};

export const verifyResetOtp: RequestHandler = async (req, res, next) => {
  try {
    ok(res, await verifyPasswordResetOtp(req.body), 'Password reset OTP verified');
  } catch (error) {
    next(error);
  }
};

export const reset: RequestHandler = async (req, res, next) => {
  try {
    ok(res, await resetPassword(req.body), 'Password reset complete');
  } catch (error) {
    next(error);
  }
};

export const me: RequestHandler = async (req, res) => {
  const current = await getSession(req);
  ok(res, { authenticated: Boolean(current), user: current?.user ?? null });
};

export const rememberedIdentities: RequestHandler = async (req, res, next) => {
  try {
    ok(res, await getRememberedIdentityRecords(req.body));
  } catch (error) {
    next(error);
  }
};

export const refresh: RequestHandler = async (req, res) => {
  const current = await requireCurrentSession(req);
  ok(res, { user: current.user }, 'Session refreshed');
};

export const updateProfile: RequestHandler = async (req, res, next) => {
  try {
    await requireCurrentSession(req);
    ok(res, { user: await updateIdentityProfile(req, req.body) }, 'Profile updated');
  } catch (error) {
    next(error);
  }
};

export const appToken: RequestHandler = async (req, res) => {
  await requireCurrentSession(req);
  const appId = typeof req.query.appId === 'string' ? req.query.appId : 'sk-quiz';
  const payload = await createAppToken(req, appId);
  ok(res, payload, 'Issued application token');
};

export const validateToken: RequestHandler = async (req, res) => {
  const token = typeof req.body?.token === 'string' ? req.body.token : '';
  const payload = token ? verifySignedToken(token) : null;
  ok(res, { valid: Boolean(payload), payload });
};

export const sessions: RequestHandler = async (req, res) => {
  await requireCurrentSession(req);
  ok(res, await listSessions(req));
};

export const usage: RequestHandler = async (req, res, next) => {
  try {
    ok(res, await recordUsage(req, req.body));
  } catch (error) {
    next(error);
  }
};

export const identityAnalytics: RequestHandler = async (req, res, next) => {
  try {
    ok(res, await getIdentityAnalytics(req));
  } catch (error) {
    next(error);
  }
};

export const updateUserRole: RequestHandler = async (req, res, next) => {
  try {
    ok(res, await setUserRole(req, req.body), 'User role updated');
  } catch (error) {
    next(error);
  }
};

export const revokeUserSessions: RequestHandler = async (req, res, next) => {
  try {
    ok(res, await revokeUser(req, req.body), 'User sessions revoked');
  } catch (error) {
    next(error);
  }
};

export const signOut: RequestHandler = async (req, res) => {
  await logout(req, res, false);
  ok(res, { loggedOut: true }, 'Logged out');
};

export const globalSignOut: RequestHandler = async (req, res) => {
  await logout(req, res, true);
  ok(res, { loggedOut: true }, 'Logged out everywhere');
};
