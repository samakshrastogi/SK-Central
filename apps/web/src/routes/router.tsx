import { lazy, Suspense } from 'react';
import type { ReactNode } from 'react';
import { createBrowserRouter, Navigate } from 'react-router';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { Skeleton } from '@/components/common/Skeleton';
import { AppLayout } from '@/layouts/AppLayout';
import { useAuthStore } from '@/store/authStore';
import { hasAdminReadAccess } from '@/utils/adminAccess';

const LandingPage = lazy(() => import('@/pages/LandingPage'));
const AdminPage = lazy(() => import('@/pages/AdminPage'));
const AnalyticsPage = lazy(() => import('@/pages/AnalyticsPage'));
const DocumentationPage = lazy(() => import('@/pages/DocumentationPage'));
const ProfilePage = lazy(() => import('@/pages/ProfilePage'));
const LoginPage = lazy(() => import('@/pages/LoginPage'));

function PageLoader() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-12 max-w-md" />
      <Skeleton className="h-64" />
      <Skeleton className="h-32" />
    </div>
  );
}

function LazyPage({ children }: { children: ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

function AdminOnly({ children }: { children: ReactNode }) {
  const user = useAuthStore((state) => state.user);
  if (!hasAdminReadAccess(user)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export const router = createBrowserRouter([
  { path: '/login', element: <LazyPage><LoginPage /></LazyPage> },
  {
    path: '/',
    element: (
      <ErrorBoundary>
        <AppLayout />
      </ErrorBoundary>
    ),
    children: [
      { index: true, element: <LazyPage><LandingPage /></LazyPage> },
      { path: 'docs', element: <LazyPage><DocumentationPage /></LazyPage> },
      { path: 'analytics', element: <AdminOnly><LazyPage><AnalyticsPage /></LazyPage></AdminOnly> },
      { path: 'admin', element: <AdminOnly><LazyPage><AdminPage /></LazyPage></AdminOnly> },
      { path: 'profile', element: <LazyPage><ProfilePage /></LazyPage> },
      { path: 'settings', element: <Navigate to="/profile" replace /> },
      { path: 'activity', element: <Navigate to="/" replace /> },
      { path: 'products', element: <Navigate to="/" replace /> },
      { path: 'products/:slug', element: <Navigate to="/docs" replace /> },
      { path: 'applications', element: <Navigate to="/" replace /> },
      { path: 'assistant', element: <Navigate to="/" replace /> },
      { path: 'community', element: <Navigate to="/" replace /> },
      { path: 'help', element: <Navigate to="/" replace /> },
      { path: '*', element: <Navigate to="/" replace /> }
    ]
  }
]);
