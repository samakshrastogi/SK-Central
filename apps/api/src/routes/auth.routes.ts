import { Router } from 'express';
import { appToken, forgot, globalSignOut, identityAnalytics, login, me, refresh, register, rememberedIdentities, rememberedLogin, resendVerification, reset, revokeUserSessions, sessions, signOut, updateProfile, updateUserRole, usage, validateToken, verifyEmail, verifyResetOtp } from '@/controllers/auth.controller.js';

export const authRoutes = Router();

authRoutes.post('/login', login);
authRoutes.post('/remembered-login', rememberedLogin);
authRoutes.post('/register', register);
authRoutes.post('/verify-email', verifyEmail);
authRoutes.post('/resend-verification', resendVerification);
authRoutes.post('/forgot-password', forgot);
authRoutes.post('/verify-reset-otp', verifyResetOtp);
authRoutes.post('/reset-password', reset);
authRoutes.post('/remembered-identities', rememberedIdentities);
authRoutes.get('/me', me);
authRoutes.post('/refresh', refresh);
authRoutes.patch('/profile', updateProfile);
authRoutes.get('/app-token', appToken);
authRoutes.post('/validate', validateToken);
authRoutes.get('/sessions', sessions);
authRoutes.post('/usage', usage);
authRoutes.get('/identity-analytics', identityAnalytics);
authRoutes.post('/users/role', updateUserRole);
authRoutes.post('/users/revoke', revokeUserSessions);
authRoutes.post('/logout', signOut);
authRoutes.post('/global-logout', globalSignOut);
