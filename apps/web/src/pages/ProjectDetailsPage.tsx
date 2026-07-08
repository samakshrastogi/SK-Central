import { ArrowUpRight, BookOpen, Github } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { projects } from '@/constants/projects';
import { cn } from '@/utils/cn';

export default function ProjectDetailsPage() {
  const { slug } = useParams();
  const project = projects.find((item) => item.slug === slug) ?? projects[0];

  return (
    <div className="px-6 py-10">
      <div className="mx-auto max-w-7xl">
        <section className={cn('overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br p-8 shadow-panel', project.gradient)}>
          <div className="grid gap-8 lg:grid-cols-[1fr_340px] lg:items-end">
            <div>
              <Link to="/products" className="text-sm font-bold text-white/80 hover:text-white">
                Back to products
              </Link>
              <div className="mt-8 grid h-20 w-20 place-items-center rounded-3xl bg-ink text-2xl font-black text-white">
                {project.logo}
              </div>
              <p className="mt-5 text-sm font-semibold uppercase tracking-[0.24em] text-white/75">{project.category}</p>
              <h1 className="mt-2 text-5xl font-black text-white">{project.name}</h1>
              <p className="mt-4 max-w-3xl text-lg leading-8 text-white/82">{project.longDescription}</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <a href="#" className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 font-bold text-ink">
                  Launch <ArrowUpRight size={18} />
                </a>
                <a href="#" className="inline-flex items-center gap-2 rounded-2xl border border-white/20 px-5 py-3 font-bold text-white">
                  Documentation <BookOpen size={18} />
                </a>
                <a href="#" className="inline-flex items-center gap-2 rounded-2xl border border-white/20 px-5 py-3 font-bold text-white">
                  GitHub <Github size={18} />
                </a>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {project.metrics.map((metric) => (
                <div key={metric.label} className="rounded-2xl border border-white/15 bg-ink/50 p-4">
                  <strong className="block text-xl text-white">{metric.value}</strong>
                  <span className="text-xs text-slate-300">{metric.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
          <section className="space-y-6">
            {[
              ['Overview', project.longDescription],
              ['Architecture', 'REST APIs, modular services, repository boundaries, MongoDB persistence, Socket.IO events, and future Redis-backed caching are prepared for scale.'],
              ['Release Notes', `${project.name} ${project.version} focuses on platform readiness, operational visibility, refined UX states, and administration surfaces.`]
            ].map(([title, description]) => (
              <article key={title} className="glass rounded-2xl p-6">
                <h2 className="text-2xl font-bold text-white">{title}</h2>
                <p className="mt-3 leading-7 text-slate-300">{description}</p>
              </article>
            ))}
            <article className="glass rounded-2xl p-6">
              <h2 className="text-2xl font-bold text-white">Screenshots</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="aspect-video rounded-2xl border border-white/10 bg-white/8" />
                ))}
              </div>
            </article>
          </section>
          <aside className="space-y-6">
            <section className="glass rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white">Tech Stack</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {project.technologies.map((technology) => (
                  <span key={technology} className="rounded-full bg-white/10 px-3 py-1.5 text-sm text-slate-200">
                    {technology}
                  </span>
                ))}
              </div>
            </section>
            <section className="glass rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white">Features</h2>
              <ul className="mt-4 space-y-3">
                {project.features.map((feature) => (
                  <li key={feature} className="rounded-xl bg-white/6 p-3 text-sm text-slate-200">
                    {feature}
                  </li>
                ))}
              </ul>
            </section>
            <section className="glass rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white">Roadmap and FAQs</h2>
              <ul className="mt-4 space-y-3">
                {project.roadmap.map((item) => (
                  <li key={item} className="rounded-xl bg-white/6 p-3 text-sm text-slate-200">
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
