import { ProjectCard } from '@/components/projects/ProjectCard';
import { futureProjects, projects } from '@/constants/projects';

export default function ProductsPage() {
  return (
    <div className="px-6 py-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-aqua">Applications</p>
          <h1 className="mt-2 text-4xl font-black text-white">Every SK project from one launch surface</h1>
          <p className="mt-3 max-w-3xl leading-7 text-slate-300">
            Premium cards expose product status, documentation, versioning, technology, metrics, and launch paths.
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
        <section className="mt-10 rounded-3xl border border-dashed border-white/15 bg-white/5 p-6">
          <h2 className="text-2xl font-bold text-white">Future Projects</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-5">
            {futureProjects.map((project) => (
              <div key={project} className="rounded-2xl border border-white/10 bg-ink/40 p-4 text-sm font-semibold text-slate-200">
                {project}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
