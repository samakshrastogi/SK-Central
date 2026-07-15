import { ChevronDown, FileText, Menu } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { MarkdownPreview } from '@/components/documentation/MarkdownPreview';
import { useApplicationStore } from '@/store/applicationStore';

export default function DocumentationPage() {
  const applications = useApplicationStore((state) => state.applications);
  const [params] = useSearchParams();
  const initial = params.get('app') ?? applications[0]?.slug;
  const [activeSlug, setActiveSlug] = useState(initial);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const activeApp = applications.find((app) => app.slug === activeSlug) ?? applications[0];
  const activeDoc = activeApp?.docs.find((doc) => doc.id === activeDocId) ?? activeApp?.docs[0];
  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (mobileMenuOpen && !mobileMenuRef.current?.contains(event.target as Node)) setMobileMenuOpen(false);
    };
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, [mobileMenuOpen]);


  const selectApp = (slug: string) => {
    setActiveSlug(slug);
    setActiveDocId(null);
    setMobileMenuOpen(false);
  };

  return (
    <div className="grid h-[calc(100dvh-5.5rem)] min-h-0 max-h-[calc(100dvh-5.5rem)] grid-rows-[auto_1fr] gap-2 overflow-hidden lg:grid-cols-[220px_1fr] lg:grid-rows-1">
      <div ref={mobileMenuRef} className="glass relative z-20 rounded-[1.1rem] p-2 lg:hidden">
        <button type="button" onClick={() => setMobileMenuOpen((open) => !open)} className="flex w-full items-center gap-2 rounded-xl bg-white/85 px-3 py-2 text-left text-sm font-black text-slate-900" aria-expanded={mobileMenuOpen}>
          <Menu size={17} />
          <span className="min-w-0 flex-1 truncate">{activeApp?.name ?? 'Applications'}</span>
          <ChevronDown size={16} className={`transition ${mobileMenuOpen ? 'rotate-180' : ''}`} />
        </button>
        {mobileMenuOpen ? (
          <div className="absolute inset-x-2 top-[calc(100%+0.25rem)] max-h-[55dvh] space-y-1 overflow-y-auto rounded-2xl border border-slate-900/10 bg-white p-2 shadow-2xl">
            {applications.map((app) => (
              <button key={app.id} type="button" onClick={() => selectApp(app.slug)} className={`w-full rounded-xl px-3 py-2 text-left ${activeApp?.slug === app.slug ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-700'}`}>
                <strong className="block text-sm">{app.name}</strong>
                <span className="text-xs opacity-70">{app.docs.length} documentation file{app.docs.length === 1 ? '' : 's'}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <aside className="glass sticky top-0 hidden h-full min-h-0 self-start overflow-hidden rounded-[1.25rem] p-2.5 lg:block">
        <div className="flex items-center gap-2 rounded-2xl border border-slate-900/10 bg-white/80 px-3 py-2 text-sm font-black text-slate-700">
          <FileText size={16} className="text-cyan-700" />
          Applications
        </div>
        <div className="scrollbar-hidden mt-2 h-[calc(100%-3rem)] space-y-1.5 overflow-y-auto">
          {applications.map((app) => (
            <button
              key={app.id}
              type="button"
              onClick={() => selectApp(app.slug)}
              className={`w-full rounded-xl px-2.5 py-2 text-left transition ${activeApp?.slug === app.slug ? 'bg-slate-950 text-white shadow-lg' : 'bg-white/60 text-slate-700 hover:bg-white'}`}
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
            <iframe title={activeDoc.name} src={activeDoc.url} className="h-full min-h-[420px] w-full rounded-2xl border border-slate-900/10 bg-white" />
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
