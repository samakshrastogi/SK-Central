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
    return parsed.filter((identity) => identity.email && identity.name).slice(0, 6);
  } catch {
    return [];
  }
};

export const rememberIdentity = (user: Pick<CentralUser, 'email' | 'name' | 'avatarUrl' | 'avatarInitials'>) => {
  if (!canUseStorage()) return;
  const identity = { email: user.email, name: user.name };
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
    window.localStorage.setItem(rememberedKey, JSON.stringify(valid.map(({ email, name }) => ({ email, name }))));
    return valid;
  } catch {
    return remembered;
  }
};

interface AuthStore {
  user: CentralUser | null;
  loading: boolean;
  initialized: boolean;
  login: (email: string, password: string) => Promise<void>;
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
      rememberIdentity(response.data.data.user);
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
