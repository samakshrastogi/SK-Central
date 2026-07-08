import { Bell, CheckCheck, X } from 'lucide-react';
import { notifications } from '@/constants/projects';
import { useUiStore } from '@/store/uiStore';

export function NotificationDrawer() {
  const open = useUiStore((state) => state.notificationsOpen);
  const setOpen = useUiStore((state) => state.setNotificationsOpen);
  const unread = notifications.filter((item) => item.unread).length;

  if (!open) return null;

  return (
    <aside className="fixed right-4 top-16 z-40 w-[calc(100vw-2rem)] max-w-md rounded-3xl glass">
      <header className="flex items-center justify-between border-b border-slate-900/10 p-4">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-100 text-cyan-700">
            <Bell size={18} />
          </span>
          <div>
            <h2 className="font-bold text-slate-950">Notifications</h2>
            <p className="text-xs text-slate-400">{unread} unread updates</p>
          </div>
        </div>
        <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
          <X size={18} />
        </button>
      </header>
      <div className="max-h-[70vh] space-y-3 overflow-y-auto p-4 scrollbar-soft">
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-900/10 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100"
        >
          <CheckCheck size={16} /> Mark all read
        </button>
        {notifications.map((notification) => (
          <article key={notification.id} className="rounded-xl border border-slate-900/10 bg-white/70 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">{notification.group}</p>
                <h3 className="mt-2 font-semibold text-slate-950">{notification.title}</h3>
              </div>
              {notification.unread ? <span className="mt-1 h-2.5 w-2.5 rounded-full bg-brand-coral" /> : null}
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">{notification.description}</p>
            <time className="mt-3 block text-xs text-slate-500">{notification.createdAt}</time>
          </article>
        ))}
      </div>
    </aside>
  );
}
