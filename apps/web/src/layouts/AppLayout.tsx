import { Bell, Search, UserRound } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { NavLink, Outlet } from 'react-router';
import gsap from 'gsap';
import { FloatingAssistant } from '@/components/assistant/FloatingAssistant';
import { GlobalSearch } from '@/components/search/GlobalSearch';
import { NotificationDrawer } from '@/components/notifications/NotificationDrawer';
import { bottomNavigation } from '@/constants/navigation';
import { notifications } from '@/constants/projects';
import { useUiStore } from '@/store/uiStore';
import { cn } from '@/utils/cn';

export function AppLayout() {
  const dockRef = useRef<HTMLElement>(null);
  const setCommandOpen = useUiStore((state) => state.setCommandOpen);
  const setNotificationsOpen = useUiStore((state) => state.setNotificationsOpen);
  const unread = notifications.filter((notification) => notification.unread).length;

  useEffect(() => {
    if (!dockRef.current) return;
    gsap.fromTo(
      dockRef.current,
      { y: 32, opacity: 0, scale: 0.96 },
      { y: 0, opacity: 1, scale: 1, duration: 0.7, ease: 'power3.out' }
    );
  }, []);

  return (
    <div className="min-h-screen bg-transparent text-slate-950">
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
            className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-cyan-400 via-amber-300 to-rose-400 text-slate-950 shadow-sm"
            aria-label="Profile"
          >
            <UserRound size={18} />
          </NavLink>
        </div>
      </header>
      <main className="mx-auto min-h-[calc(100vh-3.5rem)] max-w-[1600px] px-3 pb-28 pt-3 sm:px-5">
        <Outlet />
      </main>
      <nav
        ref={dockRef}
        className="fixed bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-1 rounded-[28px] border border-slate-900/10 bg-white/75 p-2 shadow-[0_24px_80px_rgba(15,23,42,0.18)] backdrop-blur-2xl"
        aria-label="Primary navigation"
      >
        {bottomNavigation.map((item) => (
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
