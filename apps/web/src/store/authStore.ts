import { create } from 'zustand';
import { api } from '@/services/api';

export interface CentralUser {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  permissions: string[];
  temporaryAdminUntil?: string;
  avatarUrl?: string;
  avatarInitials?: string;
  createdAt?: string;
}

export interface RememberedIdentity {
  email: string;
  name: string;
  avatarUrl?: string;
  avatarInitials?: string;
  token?: string;
  rememberedAt?: string;
  expiresAt?: string;
}

const rememberedKey = 'sk-central-remembered-identities';

const canUseStorage = () => typeof window !== 'undefined' && Boolean(window.localStorage);

export const getInitials = (nameOrEmail: string) => {
  const source = nameOrEmail.includes('@') ? nameOrEmail.split('@')[0].replace(/[._-]/g, ' ') : nameOrEmail;
  const parts = source.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? 'S';
  const last = parts.length > 1 ? parts.at(-1)?.[0] : parts[0]?.[1];
  return `${first}${last ?? ''}`.toUpperCase();
};

export const getRememberedIdentities = (): RememberedIdentity[] => {
  if (!canUseStorage()) return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(rememberedKey) ?? '[]') as RememberedIdentity[];
    const now = Date.now();
    return parsed.filter((identity) => identity.email && identity.name && (!identity.expiresAt || new Date(identity.expiresAt).getTime() > now)).slice(0, 6);
  } catch {
    return [];
  }
};

export const rememberIdentity = (user: Pick<CentralUser, 'email' | 'name' | 'avatarUrl' | 'avatarInitials'>, token?: string) => {
  if (!canUseStorage()) return;
  const existing = getRememberedIdentities().find((item) => item.email === user.email);
  const identity: RememberedIdentity = {
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    avatarInitials: user.avatarInitials,
    token: token ?? existing?.token,
    rememberedAt: existing?.rememberedAt ?? new Date().toISOString(),
    expiresAt: existing?.expiresAt ?? new Date(Date.now() + 3650 * 24 * 60 * 60 * 1000).toISOString()
  };
  const next = [identity, ...getRememberedIdentities().filter((item) => item.email !== user.email)].slice(0, 6);
  window.localStorage.setItem(rememberedKey, JSON.stringify(next));
};

export const validateRememberedIdentities = async () => {
  const remembered = getRememberedIdentities();
  if (!remembered.length) return [];
  try {
    const response = await api.post('/auth/remembered-identities', { emails: remembered.map((identity) => identity.email) });
    const valid = (response.data.data as RememberedIdentity[]).map((identity) => ({
      email: identity.email,
      name: identity.name,
      avatarUrl: identity.avatarUrl,
      avatarInitials: identity.avatarInitials
    }));
    const merged = valid.map((identity) => {
      const local = remembered.find((item) => item.email === identity.email);
      return { ...local, ...identity, token: local?.token, rememberedAt: local?.rememberedAt, expiresAt: local?.expiresAt };
    });
    window.localStorage.setItem(rememberedKey, JSON.stringify(merged));
    return merged;
  } catch {
    return remembered;
  }
};

export const removeRememberedIdentities = (emails: string[]) => {
  if (!canUseStorage()) return [];
  const removing = new Set(emails.map((email) => email.trim().toLowerCase()));
  const next = getRememberedIdentities().filter((identity) => !removing.has(identity.email.toLowerCase()));
  window.localStorage.setItem(rememberedKey, JSON.stringify(next));
  return next;
};

interface AuthStore {
  user: CentralUser | null;
  loading: boolean;
  initialized: boolean;
  login: (email: string, password: string) => Promise<void>;
  rememberedLogin: (identity: RememberedIdentity) => Promise<void>;
  loadSession: () => Promise<CentralUser | null>;
  logout: (global?: boolean) => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  loading: false,
  initialized: false,
  login: async (email, password) => {
    set({ loading: true });
    try {
      const response = await api.post('/auth/login', { email, password });
      rememberIdentity(response.data.data.user, response.data.data.rememberedToken);
      set({ user: response.data.data.user, initialized: true });
    } finally {
      set({ loading: false });
    }
  },
  rememberedLogin: async (identity) => {
    if (!identity.token) throw new Error('Password confirmation required');
    set({ loading: true });
    try {
      const response = await api.post('/auth/remembered-login', { token: identity.token });
      rememberIdentity(response.data.data.user, identity.token);
      set({ user: response.data.data.user, initialized: true });
    } finally {
      set({ loading: false });
    }
  },
  loadSession: async () => {
    set({ loading: true });
    try {
      const response = await api.get('/auth/me');
      if (response.data.data.user) rememberIdentity(response.data.data.user);
      set({ user: response.data.data.user, loading: false, initialized: true });
      return response.data.data.user;
    } catch {
      set({ user: null, loading: false, initialized: true });
      return null;
    }
  },
  logout: async (global = false) => {
    await api.post(global ? '/auth/global-logout' : '/auth/logout');
    set({ user: null, initialized: true });
  }
}));
