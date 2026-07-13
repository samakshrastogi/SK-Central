import { Search, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { projects } from '@/constants/projects';
import { useApplicationStore } from '@/store/applicationStore';
import { useUiStore } from '@/store/uiStore';

const commandGroups = ['Applications', 'Documentation', 'Analytics', 'Commands'];

export function GlobalSearch() {
  const [query, setQuery] = useState('');
  const commandOpen = useUiStore((state) => state.commandOpen);
  const setCommandOpen = useUiStore((state) => state.setCommandOpen);
  const applications = useApplicationStore((state) => state.applications);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setCommandOpen(true);
      }
      if (event.key === 'Escape') setCommandOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [setCommandOpen]);

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return applications.slice(0, 8);
    return applications.filter((project) =>
      [project.name, project.category, project.description, ...project.technologies].some((value) =>
        value.toLowerCase().includes(normalized)
      )
    );
  }, [applications, query]);

  if (!commandOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/25 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" onMouseDown={() => setCommandOpen(false)}>
      <section className="glass mx-auto mt-16 max-w-3xl overflow-hidden rounded-3xl" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-slate-900/10 px-4 py-3">
          <Search className="text-cyan-600" size={20} aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            autoFocus
            placeholder="Search applications, docs, analytics, commands..."
            className="min-w-0 flex-1 border-0 bg-transparent text-base text-slate-950 placeholder:text-slate-400 focus:ring-0"
          />
          <button
            type="button"
            onClick={() => setCommandOpen(false)}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
            aria-label="Close search"
          >
            <X size={18} />
          </button>
        </div>
        <div className="grid gap-4 p-4 md:grid-cols-[180px_1fr]">
          <nav className="space-y-2">
            {commandGroups.map((group) => (
              <button
                key={group}
                type="button"
                className="w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-600 hover:bg-slate-100"
              >
                {group}
              </button>
            ))}
          </nav>
          <div className="space-y-2">
            {results.map((project) => (
              <Link
                key={project.id}
                to={`/docs?app=${project.slug}`}
                onClick={() => setCommandOpen(false)}
                className="block rounded-xl border border-slate-900/10 bg-white/70 p-3 transition hover:bg-cyan-50"
              >
                <div className="flex items-center justify-between gap-3">
                  <strong className="text-slate-950">{project.name}</strong>
                  <span className="text-xs text-slate-400">{project.category}</span>
                </div>
                <p className="mt-1 line-clamp-1 text-sm text-slate-500">{project.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
