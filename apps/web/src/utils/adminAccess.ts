import type { CentralUser } from '@/store/authStore';

export const hasAdminReadAccess = (user: CentralUser | null | undefined) =>
  user?.role === 'admin' || (
    user?.permissions.includes('admin:read') === true
    && Boolean(user.temporaryAdminUntil)
    && new Date(user.temporaryAdminUntil as string).getTime() > Date.now()
  );

export const isReadOnlyAdmin = (user: CentralUser | null | undefined) =>
  Boolean(user && user.role !== 'admin');