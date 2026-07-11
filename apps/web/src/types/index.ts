import type { LucideIcon } from 'lucide-react';

export type ProjectStatus = 'Live' | 'Beta' | 'Preview' | 'Planned';

export interface Project {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string;
  longDescription: string;
  status: ProjectStatus;
  version: string;
  technologies: string[];
  gradient: string;
  logo: string;
  metrics: Array<{ label: string; value: string }>;
  features: string[];
  roadmap: string[];
}

export type DocumentationType = 'md' | 'pdf' | 'docx';

export interface ApplicationDocumentation {
  id: string;
  name: string;
  type: DocumentationType;
  content?: string;
  url?: string;
  size?: number;
  uploadedAt: string;
}

export interface ManagedApplication extends Project {
  liveLink: string;
  docs: ApplicationDocumentation[];
  analytics: {
    users: string;
    requests: string;
    uptime: string;
    errors: string;
    storage: string;
    growth: string;
  };
  adminAnalytics?: {
    sourcePath: string;
    endpoint: string;
    collections: string[];
    summaryFields: Array<{ key: string; label: string; description: string }>;
    modelTables: Array<{ key: string; label: string; columns: string[] }>;
    distributions: string[];
    rows: string[];
    timelineFields: string[];
    insights: string[];
    realtimeEvents: string[];
  };
}

export interface NavigationItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  group: 'Launches' | 'System' | 'Community' | 'AI';
  unread: boolean;
  createdAt: string;
  targetUrl?: string;
}

export interface ActivityItem {
  id: string;
  title: string;
  description: string;
  type: 'launch' | 'update' | 'system' | 'community';
  time: string;
}
