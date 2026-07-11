import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { MarkdownPreview } from '@/components/documentation/MarkdownPreview';
import { useApplicationStore } from '@/store/applicationStore';

export default function DocumentationPage() {
  const applications = useApplicationStore((state) => state.applications);
  const [params] = useSearchParams();
  const initial = params.get('app') ?? applications[0]?.slug;
  const [activeSlug, setActiveSlug] = useState(initial);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const activeApp = applications.find((app) => app.slug === activeSlug) ?? applications[0];
  const activeDoc = activeApp.docs.find((doc) => doc.id === activeDocId) ?? activeApp.docs[0];
  const filtered = useMemo(() => {
    const normalized = query.toLowerCase();
    return applications.filter((app) =>
      [app.name, app.description, app.category, ...app.technologies, ...app.docs.map((doc) => doc.name)].some((value) =>
        value.toLowerCase().includes(normalized)
      )
    );
  }, [applications, query]);

  const selectApp = (slug: string) => {
    setActiveSlug(slug);
    setActiveDocId(null);
  };

  return (
    <div className="grid gap-3 lg:grid-cols-[280px_1fr]">
      <aside className="glass sticky top-17 h-[calc(100vh-7rem)] rounded-[1.5rem] p-3">
        <div className="flex items-center gap-2 rounded-2xl border border-slate-900/10 bg-white/80 px-3 py-2">
          <Search size={16} className="text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search docs"
            className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm text-slate-950 placeholder:text-slate-400 focus:ring-0"
          />
        </div>
        <div className="mt-3 h-[calc(100%-3.5rem)] space-y-2 overflow-y-auto pr-1">
          {filtered.map((app) => (
            <button
              key={app.id}
              type="button"
              onClick={() => selectApp(app.slug)}
              className={`w-full rounded-2xl p-3 text-left transition ${activeApp.slug === app.slug ? 'bg-slate-950 text-white shadow-lg' : 'bg-white/60 text-slate-700 hover:bg-white'}`}
            >
              <strong className="block text-sm">{app.name}</strong>
              <span className="text-xs opacity-75">{app.docs.length} documentation section{app.docs.length === 1 ? '' : 's'}</span>
            </button>
          ))}
        </div>
      </aside>

      <section className="glass flex h-[calc(100vh-7rem)] flex-col rounded-[1.5rem] p-3">
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-900/10 pb-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-700">Documentation</p>
            <h1 className="mt-1 text-2xl font-black text-slate-950">{activeApp.name}</h1>
            <p className="mt-1 max-w-5xl text-sm leading-6 text-slate-600">{activeApp.longDescription}</p>
          </div>
          <a href={activeApp.liveLink} target="_blank" rel="noreferrer" className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-black text-white">
            Launch
          </a>
        </header>

        <div className="mt-3 flex flex-wrap gap-2">
          {activeApp.docs.map((doc, index) => (
            <button
              key={doc.id}
              type="button"
              onClick={() => setActiveDocId(doc.id)}
              aria-label={`Open documentation section ${index + 1}`}
              className={`inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-black transition ${activeDoc.id === doc.id ? 'bg-cyan-600 text-white' : 'bg-white/75 text-slate-700 hover:bg-cyan-50'}`}
            >
              Section {index + 1}
            </button>
          ))}
        </div>

        <article className="mt-3 min-h-0 flex-1 overflow-y-auto rounded-[1.4rem] border border-slate-900/10 bg-white/82 p-4 shadow-sm">
          {activeDoc.type === 'md' ? (
            <MarkdownPreview content={activeDoc.content ?? ''} />
          ) : activeDoc.type === 'pdf' && activeDoc.url ? (
            <iframe title={activeDoc.name} src={activeDoc.url} className="h-[620px] w-full rounded-2xl border border-slate-900/10 bg-white" />
          ) : (
            <div className="rounded-2xl bg-slate-50 p-5 text-sm leading-6 text-slate-600">
              <strong className="block text-slate-950">Document preview is being prepared.</strong>
              Inline DOCX rendering needs a server-side conversion pipeline. For the cleanest reader experience, upload Markdown or PDF, or add a conversion service that turns DOCX into HTML/PDF during upload.
            </div>
          )}
        </article>
      </section>
    </div>
  );
}
