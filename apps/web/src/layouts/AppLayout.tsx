import { Bell, Search } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Navigate, NavLink, Outlet, useLocation } from 'react-router';
import gsap from 'gsap';
import { FloatingAssistant } from '@/components/assistant/FloatingAssistant';
import { GlobalSearch } from '@/components/search/GlobalSearch';
import { NotificationDrawer } from '@/components/notifications/NotificationDrawer';
import { bottomNavigation } from '@/constants/navigation';
import { api } from '@/services/api';
import { useUiStore } from '@/store/uiStore';
import { getInitials, useAuthStore } from '@/store/authStore';
import { useApplicationStore } from '@/store/applicationStore';
import { useNotificationStore } from '@/store/notificationStore';
import { cn } from '@/utils/cn';

export function AppLayout() {
  const dockRef = useRef<HTMLElement>(null);
  const setCommandOpen = useUiStore((state) => state.setCommandOpen);
  const setNotificationsOpen = useUiStore((state) => state.setNotificationsOpen);
  const notificationItems = useNotificationStore((state) => state.items);
  const loadNotifications = useNotificationStore((state) => state.load);
  const loadApplications = useApplicationStore((state) => state.loadApplications);
  const profile = useApplicationStore((state) => state.profile);
  const { user, initialized, loadSession } = useAuthStore();
  const location = useLocation();
  const unread = notificationItems.filter((notification) => notification.unread).length;
  const isAdmin = user?.role === 'admin';
  const visibleNavigation = bottomNavigation.filter((item) => isAdmin || !['/admin', '/analytics'].includes(item.href));
  const isViewportPage = location.pathname.startsWith('/documentation');

  useEffect(() => {
    if (!isViewportPage) return;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyHeight = document.body.style.height;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.height = '100dvh';
    window.scrollTo(0, 0);
    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.height = previousBodyHeight;
    };
  }, [isViewportPage]);
  useEffect(() => {
    if (!initialized) void loadSession();
  }, [initialized, loadSession]);

  useEffect(() => {
    if (!user) return;
    void loadApplications();
    void loadNotifications();
    const loadWhenVisible = () => {
      if (document.visibilityState === 'visible') void loadNotifications();
    };
    const interval = window.setInterval(loadWhenVisible, 60_000);
    window.addEventListener('focus', loadWhenVisible);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', loadWhenVisible);
    };
  }, [loadApplications, loadNotifications, user]);

  useEffect(() => {
    if (!user) return;
    const startedAt = Date.now();
    const interval = window.setInterval(() => {
      void api.post('/auth/usage', { platform: 'sk-central', type: 'active_time', durationSeconds: 60 }).catch(() => undefined);
    }, 60_000);
    const onPageHide = () => {
      const durationSeconds = Math.max(1, Math.floor((Date.now() - startedAt) / 1000));
      const payload = JSON.stringify({ platform: 'sk-central', type: 'active_time', durationSeconds });
      navigator.sendBeacon?.(`${api.defaults.baseURL}/auth/usage`, new Blob([payload], { type: 'application/json' }));
    };
    window.addEventListener('pagehide', onPageHide);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, [user]);

  useEffect(() => {
    if (!dockRef.current) return;
    gsap.fromTo(
      dockRef.current,
      { y: 32, opacity: 0, scale: 0.96 },
      { y: 0, opacity: 1, scale: 1, duration: 0.7, ease: 'power3.out' }
    );
  }, []);

  if (!initialized) {
    return (
      <div className="grid min-h-screen place-items-center px-4 text-center">
        <div className="glass rounded-[2rem] p-6 shadow-2xl">
          <div className="mx-auto h-10 w-10 animate-pulse rounded-2xl bg-slate-950" />
          <p className="mt-4 text-sm font-black text-slate-600">Checking SK Auth session...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    const returnTo = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={`/login?returnTo=${encodeURIComponent(returnTo)}`} replace />;
  }

  return (
    <div className={cn('bg-transparent text-slate-950', isViewportPage ? 'fixed inset-0 h-[100dvh] overflow-hidden' : 'min-h-screen')}>
      <header className="sticky top-0 z-40 border-b border-slate-900/10 bg-white/72 backdrop-blur-2xl">
        <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-3 px-3 sm:px-5">
          <NavLink to="/" className="flex min-w-fit items-center gap-2" aria-label="SK Central overview">
            <span className="grid h-9 w-9 place-items-center rounded-2xl bg-slate-950 text-sm font-black text-white shadow-sm">SK</span>
            <span className="hidden text-base font-black tracking-tight sm:inline">SK Central</span>
          </NavLink>
          <button
            type="button"
            onClick={() => setCommandOpen(true)}
            className="group ml-auto flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl border border-slate-900/10 bg-white/80 text-slate-600 shadow-sm transition-all duration-300 hover:w-[min(520px,55vw)] hover:justify-start hover:px-3 focus:w-[min(520px,55vw)] focus:justify-start focus:px-3"
            aria-label="Open global search"
          >
            <Search size={18} />
            <span className="ml-2 hidden min-w-0 whitespace-nowrap text-sm text-slate-500 group-hover:inline group-focus:inline">
              Search apps, docs, analytics
            </span>
          </button>
          <button
            type="button"
            onClick={() => setNotificationsOpen(true)}
            className="relative grid h-10 w-10 place-items-center rounded-2xl border border-slate-900/10 bg-white/80 text-slate-700 shadow-sm"
            aria-label="Open notifications"
          >
            <Bell size={18} />
            {unread ? (
              <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white">
                {unread}
              </span>
            ) : null}
          </button>
          <NavLink
            to="/profile"
            className="grid h-10 w-10 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-400 via-amber-300 to-rose-400 text-sm font-black text-slate-950 shadow-sm"
            aria-label="Profile"
          >
            {user.avatarUrl || profile.avatarUrl ? <img src={user.avatarUrl || profile.avatarUrl} alt="" className="h-full w-full object-cover" /> : getInitials(user.name || profile.name || user.email)}
          </NavLink>
        </div>
      </header>
      <main className={cn('mx-auto max-w-[1600px] px-3 sm:px-5', isViewportPage ? 'h-[calc(100dvh-3.5rem)] overflow-hidden py-3' : 'min-h-[calc(100vh-4rem)] pb-28 pt-3 sm:pb-24')}>
        <Outlet />
      </main>
      <nav
        ref={dockRef}
        className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around gap-1 rounded-t-[28px] border border-slate-900/10 bg-white/90 p-2 shadow-[0_24px_80px_rgba(15,23,42,0.18)] backdrop-blur-2xl sm:bottom-4 sm:left-1/2 sm:right-auto sm:w-auto sm:-translate-x-1/2 sm:justify-center sm:rounded-[28px] sm:bg-white/75"
        aria-label="Primary navigation"
      >
        {visibleNavigation.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            className={({ isActive }) =>
              cn(
                'group flex h-12 items-center justify-center gap-2 overflow-hidden rounded-2xl px-4 text-slate-500 transition-all duration-300 hover:bg-slate-950 hover:text-white',
                isActive ? 'min-w-36 bg-slate-950 text-white shadow-lg' : 'w-12 hover:w-32'
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon className="shrink-0" size={19} />
                <span className={cn('whitespace-nowrap text-xs font-bold', isActive ? 'inline' : 'hidden group-hover:inline')}>
                  {item.label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
      <GlobalSearch />
      <NotificationDrawer />
      <FloatingAssistant />
    </div>
  );
}




