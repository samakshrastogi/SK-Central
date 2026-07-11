import {
  BarChart3,
  FileText,
  Home,
  Shield,
  UserRound
} from 'lucide-react';
import type { NavigationItem } from '@/types';

export const bottomNavigation: NavigationItem[] = [
  { label: 'Overview', href: '/', icon: Home },
  { label: 'Documentation', href: '/docs', icon: FileText },
  { label: 'Analytics', href: '/analytics', icon: BarChart3 },
  { label: 'Admin', href: '/admin', icon: Shield },
  { label: 'Profile', href: '/profile', icon: UserRound }
];

export const adminTabs = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'applications', label: 'Applications', icon: Shield },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'quiz', label: 'Quiz Coach', icon: BarChart3 },
  { id: 'flips', label: 'SK Flips', icon: BarChart3 },
  { id: 'ai', label: 'AI', icon: BarChart3 },
  { id: 'infrastructure', label: 'Infrastructure', icon: BarChart3 },
  { id: 'logs', label: 'Logs', icon: FileText },
  { id: 'settings', label: 'Settings', icon: Shield }
] as const;
