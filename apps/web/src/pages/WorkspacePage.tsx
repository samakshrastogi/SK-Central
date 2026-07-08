import { Construction } from 'lucide-react';

const copy: Record<string, string> = {
  settings: 'Settings for general preferences, appearance, projects, notifications, AI, and system configuration.'
};

export default function WorkspacePage({ area }: { area: keyof typeof copy }) {
  return (
    <div>
      <div>
        <section className="glass rounded-3xl p-4">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-950 text-white">
            <Construction size={24} />
          </span>
          <p className="mt-4 text-xs font-black uppercase tracking-[0.22em] text-cyan-700">{area}</p>
          <h1 className="mt-1 text-2xl font-black capitalize text-slate-950">{area}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{copy[area]}</p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {['Overview', 'Workflows', 'Governance'].map((item) => (
              <div key={item} className="rounded-2xl border border-slate-900/10 bg-white/70 p-4">
                <h2 className="font-bold text-slate-950">{item}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Enterprise-ready module placeholder prepared for future product expansion.
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
