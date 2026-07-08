import { Activity, Rocket, Server, Users } from 'lucide-react';
import { activities } from '@/constants/projects';

const icons = {
  launch: Rocket,
  update: Activity,
  system: Server,
  community: Users
};

export default function ActivityPage() {
  return (
    <div className="space-y-3">
      <div className="glass rounded-3xl p-4">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-700">Activity</p>
        <h1 className="mt-1 text-2xl font-black text-slate-950">Latest updates, launches, and system events</h1>
      </div>
      <div className="grid gap-3 xl:grid-cols-2">
          {activities.map((item) => {
            const Icon = icons[item.type];
            return (
              <article key={item.id} className="glass flex gap-3 rounded-3xl p-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-slate-950 text-white">
                  <Icon size={20} />
                </span>
                <div>
                  <time className="text-xs font-black uppercase tracking-[0.18em] text-cyan-700">{item.time}</time>
                  <h2 className="mt-1 text-base font-black text-slate-950">{item.title}</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{item.description}</p>
                </div>
              </article>
            );
          })}
      </div>
    </div>
  );
}
