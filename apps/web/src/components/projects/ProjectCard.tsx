import { ArrowUpRight, BookOpen, Layers3 } from 'lucide-react';
import { Link } from 'react-router';
import type { Project } from '@/types';
import { cn } from '@/utils/cn';

export function ProjectCard({ project }: { project: Project }) {
  return (
    <article className="glass group flex min-h-[230px] flex-col overflow-hidden rounded-2xl">
      <div className={cn('h-16 bg-gradient-to-br', project.gradient)} />
      <div className="flex flex-1 flex-col p-3">
        <div className="-mt-12 flex items-end justify-between gap-3">
          <div className="grid h-14 w-14 place-items-center rounded-2xl border border-slate-900/10 bg-white text-lg font-black text-slate-950 shadow-lg">
            {project.logo}
          </div>
          <span className="rounded-full border border-slate-900/10 bg-white/75 px-2 py-1 text-[11px] font-bold text-slate-700">
            {project.status}
          </span>
        </div>
        <div className="mt-3">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-600">{project.category}</p>
          <h3 className="mt-1 text-lg font-black text-slate-950">{project.name}</h3>
          <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-600">{project.description}</p>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {project.technologies.map((technology) => (
            <span key={technology} className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">
              {technology}
            </span>
          ))}
        </div>
        <div className="mt-auto grid grid-cols-3 gap-2 pt-3">
          {project.metrics.map((metric) => (
            <div key={metric.label} className="rounded-xl border border-slate-900/10 bg-white/60 p-2">
              <strong className="block text-xs text-slate-950">{metric.value}</strong>
              <span className="text-[10px] text-slate-500">{metric.label}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <Link
            to={`/docs?app=${project.slug}`}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-950 px-3 py-2 text-xs font-bold text-white transition hover:bg-cyan-600"
          >
            Docs <ArrowUpRight size={14} />
          </Link>
          <a
            href="#"
            className="inline-flex items-center justify-center rounded-xl border border-slate-900/10 bg-white/70 px-3 text-slate-700 transition hover:bg-slate-100"
            aria-label={`Open documentation for ${project.name}`}
          >
            <BookOpen size={18} />
          </a>
          <a
            href="#"
            className="inline-flex items-center justify-center rounded-xl border border-slate-900/10 bg-white/70 px-3 text-slate-700 transition hover:bg-slate-100"
            aria-label={`Launch ${project.name}`}
          >
            <Layers3 size={18} />
          </a>
        </div>
      </div>
    </article>
  );
}
