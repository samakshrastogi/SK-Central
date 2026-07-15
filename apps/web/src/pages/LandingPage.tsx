import { BookOpen, ExternalLink, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import gsap from 'gsap';
gsap.config({ nullTargetWarn: false });
import { useApplicationStore } from '@/store/applicationStore';
import { cn } from '@/utils/cn';
function ExpandableDescription({ description }: { description: string }) {
  const [expanded, setExpanded] = useState(false);

  return expanded ? (
    <p className="mt-1 text-sm leading-5 text-slate-600">
      {description}{' '}
      <button type="button" onClick={() => setExpanded(false)} className="font-black text-cyan-700 underline underline-offset-2">
        Read less
      </button>
    </p>
  ) : (
    <div className="relative mt-1 min-h-10">
      <p className="line-clamp-2 min-h-10 pr-20 text-sm leading-5 text-slate-600">{description}</p>
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="absolute bottom-0 right-0 bg-gradient-to-l from-white via-white to-white/70 pl-5 text-sm font-black leading-5 text-cyan-700 underline underline-offset-2"
      >
        Read more
      </button>
    </div>
  );
}

export default function LandingPage() {
  const rootRef = useRef<HTMLDivElement>(null);
  const applications = useApplicationStore((state) => state.applications);
  const loading = useApplicationStore((state) => state.loading);
  const error = useApplicationStore((state) => state.error);

  useEffect(() => {
    if (!rootRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo('[data-hero]', { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, stagger: 0.08, ease: 'power3.out' });
      gsap.fromTo('[data-app-card]', { y: 28, opacity: 0, scale: 0.98 }, { y: 0, opacity: 1, scale: 1, duration: 0.65, stagger: 0.06, ease: 'power2.out', delay: 0.15 });
    }, rootRef);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={rootRef} className="space-y-4">
      <section className="relative overflow-hidden rounded-[1.6rem] border border-slate-900/10 bg-white/75 p-3 shadow-[0_18px_70px_rgba(15,23,42,0.10)] backdrop-blur-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(34,211,238,0.26),transparent_28%),radial-gradient(circle_at_82%_20%,rgba(251,191,36,0.28),transparent_30%),radial-gradient(circle_at_48%_95%,rgba(244,63,94,0.14),transparent_30%)]" />
        <div className="relative">
          <div data-hero className="min-w-0">
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-white">
              <Sparkles size={14} /> SK Central
            </span>
            <h1 className="mt-2 max-w-4xl text-2xl font-black tracking-tight text-slate-950 md:text-3xl">
              One hub for SK applications.
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
              Open apps and documentation from one clean workspace.
            </p>
          </div>
        </div>
      </section>

      <section id="applications" className="space-y-3">
        <div data-hero className="flex flex-wrap items-end justify-between gap-3 px-1">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-700">Applications</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">Launch-ready product gallery</h2>
          </div>
          <p className="max-w-xl text-sm text-slate-600">Cards show status, preview, description, and direct actions for users.</p>
        </div>
        {loading ? (
          <div className="rounded-[1.5rem] border border-slate-900/10 bg-white/75 p-6 text-sm font-bold text-slate-500">Loading applications...</div>
        ) : error ? (
          <div className="rounded-[1.5rem] border border-rose-200 bg-rose-50 p-6 text-sm font-bold text-rose-700">{error}</div>
        ) : !applications.length ? (
          <div className="rounded-[1.5rem] border border-slate-900/10 bg-white/75 p-6">
            <h3 className="text-lg font-black text-slate-950">No applications published yet.</h3>
            <p className="mt-1 text-sm font-semibold text-slate-500">Admins can add production applications from the admin page.</p>
          </div>
        ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {applications.map((app) => (
            <article
              key={app.id}
              data-app-card
              className="group overflow-hidden rounded-[1.75rem] border border-slate-900/10 bg-white/80 shadow-[0_18px_60px_rgba(15,23,42,0.10)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:shadow-[0_28px_90px_rgba(15,23,42,0.16)]"
            >
              <div className="relative h-56 overflow-hidden bg-slate-100">
                <iframe
                  title={`${app.name} live preview`}
                  src={app.liveLink}
                  loading="lazy"
                  className="pointer-events-none h-[440px] w-[200%] origin-top-left scale-50 border-0 bg-white"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/65 via-transparent to-transparent" />
                <span
                  className={cn(
                    'absolute left-4 top-4 rounded-full px-3 py-1 text-xs font-black shadow-sm',
                    app.status === 'Live' ? 'bg-emerald-100 text-emerald-800' : ['Testing', 'Preview'].includes(app.status) ? 'bg-cyan-100 text-cyan-800' : 'bg-amber-100 text-amber-800'
                  )}
                >
                  {app.status}
                </span>
                <span className={cn('absolute bottom-4 left-4 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br text-sm font-black text-slate-950 shadow-lg', app.gradient)}>
                  {app.logo}
                </span>
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-black text-slate-950">{app.name}</h3>
                    <ExpandableDescription description={app.description} />
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <a href={app.liveLink} target="_blank" rel="noreferrer" className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white">
                    Visit <ExternalLink size={15} />
                  </a>
                  <Link to={`/docs?app=${app.slug}`} className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-800">
                    Documentation <BookOpen size={15} />
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
        )}
      </section>
    </div>
  );
}
