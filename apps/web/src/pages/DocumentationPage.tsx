import { FileText, Search } from 'lucide-react';
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
  const activeDoc = activeApp?.docs.find((doc) => doc.id === activeDocId) ?? activeApp?.docs[0];
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
    <div className="grid h-full min-h-0 max-h-full gap-2 overflow-hidden lg:grid-cols-[240px_1fr]">
      <aside className="glass sticky top-0 h-full min-h-0 self-start overflow-hidden rounded-[1.25rem] p-2.5">
        <div className="flex items-center gap-2 rounded-2xl border border-slate-900/10 bg-white/80 px-3 py-2">
          <Search size={16} className="text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search docs"
            className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm text-slate-950 placeholder:text-slate-400 focus:ring-0"
          />
        </div>
        <div className="scrollbar-hidden mt-2 h-[calc(100%-3rem)] space-y-1.5 overflow-y-auto">
          {filtered.map((app) => (
            <button
              key={app.id}
              type="button"
              onClick={() => selectApp(app.slug)}
              className={`w-full rounded-xl p-2.5 text-left transition ${activeApp?.slug === app.slug ? 'bg-slate-950 text-white shadow-lg' : 'bg-white/60 text-slate-700 hover:bg-white'}`}
            >
              <strong className="block text-sm">{app.name}</strong>
              <span className="text-xs opacity-75">{app.docs.length} documentation file{app.docs.length === 1 ? '' : 's'}</span>
            </button>
          ))}
        </div>
      </aside>

      <section className="glass sticky top-0 flex h-full min-h-0 flex-col self-start overflow-hidden rounded-[1.25rem] p-2">
        <article className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto scroll-smooth rounded-[1rem] border border-slate-900/10 bg-white/82 p-3 shadow-sm">
          {!activeDoc ? (
            <div className="rounded-2xl bg-slate-50 p-5 text-sm leading-6 text-slate-600">
              <strong className="block text-slate-950">No document selected.</strong>
              Add Markdown, PDF, or DOCX documentation from the admin page.
            </div>
          ) : activeDoc.type === 'md' ? (
            <MarkdownPreview content={activeDoc.content ?? ''} platformName={activeApp.name} />
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
