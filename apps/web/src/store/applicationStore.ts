import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import type { ApplicationDocumentation, ManagedApplication, ProjectStatus } from '@/types';

type ApiProject = {
  _id?: string;
  id?: string;
  slug: string;
  name: string;
  category: string;
  description: string;
  longDescription?: string;
  technologies?: string[];
  status?: ProjectStatus;
  version?: string;
  launchUrl?: string;
  liveLink?: string;
  documentationUrl?: string;
  docs?: ApplicationDocumentation[];
  metrics?: Record<string, string> | Map<string, string> | Array<{ label: string; value: string }>;
  features?: string[];
  roadmap?: string[];
  gradient?: string;
  logo?: string;
};

const emptyMetrics = { users: '0', requests: '0', uptime: 'New', errors: '0%', storage: '0 MB', growth: '0%' };

const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const metricValue = (metrics: ApiProject['metrics'], key: keyof typeof emptyMetrics) => {
  if (!metrics) return emptyMetrics[key];
  if (metrics instanceof Map) return metrics.get(key) ?? emptyMetrics[key];
  if (Array.isArray(metrics)) return metrics.find((item) => item.label.toLowerCase() === key)?.value ?? emptyMetrics[key];
  return metrics[key] ?? emptyMetrics[key];
};

export const normalizeApplication = (project: ApiProject): ManagedApplication => {
  const slug = project.slug || slugify(project.name);
  const docs = project.docs?.length
    ? project.docs
    : project.documentationUrl
      ? [{ id: `${slug}-documentation`, name: 'Documentation', type: 'md' as const, url: project.documentationUrl, uploadedAt: new Date().toISOString() }]
      : [];

  return {
    id: project.id ?? project._id ?? slug,
    slug,
    name: project.name,
    category: project.category,
    description: project.description,
    longDescription: project.longDescription ?? project.description,
    status: project.status ?? 'Planned',
    version: project.version ?? '0.1.0',
    technologies: project.technologies ?? [],
    gradient: project.gradient ?? 'from-cyan-300/50 via-amber-200/50 to-rose-300/50',
    logo: project.logo ?? project.name.slice(0, 2).toUpperCase(),
    metrics: Array.isArray(project.metrics) ? project.metrics : [],
    features: project.features ?? [],
    roadmap: project.roadmap ?? [],
    liveLink: project.liveLink ?? project.launchUrl ?? '#',
    docs,
    analytics: {
      users: metricValue(project.metrics, 'users'),
      requests: metricValue(project.metrics, 'requests'),
      uptime: metricValue(project.metrics, 'uptime'),
      errors: metricValue(project.metrics, 'errors'),
      storage: metricValue(project.metrics, 'storage'),
      growth: metricValue(project.metrics, 'growth')
    }
  };
};

interface ApplicationStore {
  applications: ManagedApplication[];
  loading: boolean;
  error: string | null;
  profile: {
    name: string;
    role: string;
    email: string;
    location: string;
    bio: string;
    avatar: string;
    avatarUrl?: string;
    theme: 'light' | 'soft' | 'vibrant';
  };
  loadApplications: () => Promise<void>;
  addApplication: (application: ManagedApplication) => Promise<void>;
  updateApplication: (application: ManagedApplication) => Promise<void>;
  deleteApplication: (id: string) => Promise<void>;
  updateProfile: (profile: Partial<ApplicationStore['profile']>) => void;
}

const toProjectPayload = (application: ManagedApplication) => ({
  name: application.name,
  slug: application.slug,
  category: application.category,
  description: application.description,
  longDescription: application.longDescription,
  technologies: application.technologies,
  status: application.status,
  version: application.version,
  launchUrl: application.liveLink,
  docs: application.docs,
  features: application.features,
  roadmap: application.roadmap,
  metrics: application.analytics,
  gradient: application.gradient,
  logo: application.logo
});

export const useApplicationStore = create<ApplicationStore>()(
  persist(
    (set, get) => ({
      applications: [],
      loading: false,
      error: null,
      profile: {
        name: '',
        role: '',
        email: '',
        location: 'India',
        bio: '',
        avatar: '',
        avatarUrl: '',
        theme: 'light'
      },
      loadApplications: async () => {
        set({ loading: true, error: null });
        try {
          const response = await api.get('/projects');
          const data = Array.isArray(response.data.data) ? response.data.data : [];
          set({ applications: data.map(normalizeApplication), loading: false });
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to load applications', loading: false });
        }
      },
      addApplication: async (application) => {
        const response = await api.post('/projects', toProjectPayload(application));
        set((state) => ({ applications: [normalizeApplication(response.data.data), ...state.applications] }));
      },
      updateApplication: async (application) => {
        const response = await api.put(`/projects/${application.slug}`, toProjectPayload(application));
        const updated = normalizeApplication(response.data.data);
        set((state) => ({
          applications: state.applications.map((item) => (item.id === application.id || item.slug === application.slug ? updated : item))
        }));
      },
      deleteApplication: async (id) => {
        const application = get().applications.find((item) => item.id === id);
        if (!application) return;
        await api.delete(`/projects/${application.slug}`);
        set((state) => ({ applications: state.applications.filter((item) => item.id !== id) }));
      },
      updateProfile: (profile) => {
        set((state) => ({
          profile: { ...state.profile, ...profile }
        }));
        const current = get().profile;
        const payload: { name?: string; avatarInitials?: string; avatarUrl?: string } = {};
        if (typeof profile.name === 'string') payload.name = profile.name;
        if (typeof profile.avatar === 'string') payload.avatarInitials = profile.avatar;
        if (typeof profile.avatarUrl === 'string') payload.avatarUrl = profile.avatarUrl;
        if (Object.keys(payload).length) {
          void api.patch('/auth/profile', payload).then((response) => {
            const user = response.data.data.user;
            if (user) {
              useAuthStore.setState({ user });
              set((state) => ({ profile: { ...state.profile, name: user.name ?? current.name, avatar: user.avatarInitials ?? current.avatar, avatarUrl: user.avatarUrl ?? current.avatarUrl } }));
            }
          }).catch(() => undefined);
        }
      }
    }),
    {
      name: 'sk-central-applications',
      version: 5,
      partialize: (state) => ({ profile: state.profile })
    }
  )
);
