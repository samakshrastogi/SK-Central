import { BookOpen, FileArchive, FileText, Search } from 'lucide-react';
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
    <div className="grid gap-4 lg:grid-cols-[330px_1fr]">
      <aside className="glass sticky top-17 h-[calc(100vh-7rem)] rounded-[1.75rem] p-3">
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
              <span className="text-xs opacity-75">{app.docs.map((doc) => doc.type.toUpperCase()).join(', ')}</span>
            </button>
          ))}
        </div>
      </aside>

      <section className="glass rounded-[1.75rem] p-4">
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-900/10 pb-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-700">Documentation</p>
            <h1 className="mt-1 text-3xl font-black text-slate-950">{activeApp.name}</h1>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">{activeApp.longDescription}</p>
          </div>
          <a href={activeApp.liveLink} target="_blank" rel="noreferrer" className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-black text-white">
            Launch
          </a>
        </header>

        <div className="mt-4 flex flex-wrap gap-2">
          {activeApp.docs.map((doc) => (
            <button
              key={doc.id}
              type="button"
              onClick={() => setActiveDocId(doc.id)}
              className={`inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-black transition ${activeDoc.id === doc.id ? 'bg-cyan-600 text-white' : 'bg-white/75 text-slate-700 hover:bg-cyan-50'}`}
            >
              {doc.type === 'md' ? <FileText size={15} /> : <FileArchive size={15} />}
              {doc.name}
            </button>
          ))}
        </div>

        <article className="mt-4 min-h-[560px] rounded-[1.75rem] border border-slate-900/10 bg-white/82 p-5 shadow-sm">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-xl font-black text-slate-950">
              <BookOpen size={20} className="text-cyan-700" /> {activeDoc.name}
            </h2>
            <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-black uppercase text-cyan-700">{activeDoc.type}</span>
          </div>
          {activeDoc.type === 'md' ? (
            <MarkdownPreview content={activeDoc.content ?? ''} />
          ) : activeDoc.type === 'pdf' && activeDoc.url ? (
            <iframe title={activeDoc.name} src={activeDoc.url} className="h-[620px] w-full rounded-2xl border border-slate-900/10 bg-white" />
          ) : (
            <div className="rounded-2xl bg-slate-50 p-5 text-sm leading-6 text-slate-600">
              <strong className="block text-slate-950">DOCX uploaded: {activeDoc.name}</strong>
              Inline DOCX rendering needs a server-side conversion pipeline. For the cleanest reader experience, upload Markdown or PDF, or add a conversion service that turns DOCX into HTML/PDF during upload.
            </div>
          )}
        </article>
      </section>
    </div>
  );
}
