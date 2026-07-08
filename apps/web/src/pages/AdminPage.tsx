import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Activity, AlertTriangle, Bot, CheckCircle2, ExternalLink, FileUp, Gauge, Pencil, Plus, Save, Server, Trash2, TrendingUp, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { adminTabs } from '@/constants/navigation';
import { api } from '@/services/api';
import { useApplicationStore } from '@/store/applicationStore';
import type { ApplicationDocumentation, ManagedApplication, ProjectStatus } from '@/types';
import { cn } from '@/utils/cn';

interface ApplicationForm {
  name: string;
  description: string;
  liveLink: string;
  category: string;
  version: string;
  status: ProjectStatus;
  technologies: string;
}

const fallbackMetrics = { users: '0', requests: '0', uptime: 'New', errors: '0%', storage: '0 MB', growth: '0%' };
const trendHeights = ['h-[42%]', 'h-[52%]', 'h-[48%]', 'h-[64%]', 'h-[72%]', 'h-[68%]', 'h-[81%]', 'h-[76%]', 'h-[90%]', 'h-[86%]', 'h-[96%]', 'h-[92%]'];
const healthWidths = ['w-[99%]', 'w-[97%]', 'w-[95%]', 'w-[91%]', 'w-[88%]', 'w-[84%]', 'w-[80%]', 'w-[76%]'];

function numeric(value: string) {
  const number = Number.parseFloat(value.replace(/[^\d.]/g, ''));
  return Number.isFinite(number) ? number : 0;
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<(typeof adminTabs)[number]['id']>('overview');
  const [docs, setDocs] = useState<ApplicationDocumentation[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedAnalyticsId, setSelectedAnalyticsId] = useState<string>('');
  const [liveSkQuiz, setLiveSkQuiz] = useState<{ connected: boolean; message: string; data?: unknown } | null>(null);
  const applications = useApplicationStore((state) => state.applications);
  const addApplication = useApplicationStore((state) => state.addApplication);
  const updateApplication = useApplicationStore((state) => state.updateApplication);
  const deleteApplication = useApplicationStore((state) => state.deleteApplication);
  const { register, handleSubmit, reset, watch } = useForm<ApplicationForm>({
    defaultValues: { status: 'Preview', version: '1.0.0', category: 'Application', liveLink: 'https://example.com' }
  });
  const liveLink = watch('liveLink');
  const analyticsProfiles = applications.filter((application) => application.adminAnalytics);
  const selectedAnalyticsApp = applications.find((application) => application.id === selectedAnalyticsId) ?? applications[0];

  const analytics = useMemo(() => {
    const totalRequests = applications.reduce((sum, app) => sum + numeric(app.analytics.requests), 0);
    const avgErrors = applications.reduce((sum, app) => sum + numeric(app.analytics.errors), 0) / Math.max(applications.length, 1);
    const healthy = applications.filter((app) => numeric(app.analytics.errors) < 0.1).length;
    return { totalRequests, avgErrors: avgErrors.toFixed(2), healthy };
  }, [applications]);
  const overviewStats: Array<{ label: string; value: string | number; icon: LucideIcon; color: string }> = [
    { label: 'Tracked Apps', value: applications.length, icon: Gauge, color: 'bg-cyan-100 text-cyan-700' },
    { label: 'Total Requests', value: `${analytics.totalRequests.toFixed(1)}M`, icon: TrendingUp, color: 'bg-emerald-100 text-emerald-700' },
    { label: 'Healthy Apps', value: analytics.healthy, icon: CheckCircle2, color: 'bg-lime-100 text-lime-700' },
    { label: 'Avg Error Rate', value: `${analytics.avgErrors}%`, icon: AlertTriangle, color: 'bg-rose-100 text-rose-700' }
  ];

  useEffect(() => {
    if (!selectedAnalyticsId && applications[0]) setSelectedAnalyticsId(applications[0].id);
  }, [applications, selectedAnalyticsId]);

  useEffect(() => {
    let mounted = true;
    const fetchLiveSkQuiz = async () => {
      try {
        const response = await api.get('/integrations/sk-quiz/admin-analytics');
        if (mounted) setLiveSkQuiz(response.data.data);
      } catch {
        if (mounted) setLiveSkQuiz({ connected: false, message: 'Unable to reach SK Central integration API.' });
      }
    };
    void fetchLiveSkQuiz();
    const interval = window.setInterval(fetchLiveSkQuiz, 30_000);
    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, []);

  const onFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    const parsedDocs = await Promise.all(
      files.map(async (file) => {
        const extension = file.name.split('.').pop()?.toLowerCase();
        const type = extension === 'pdf' ? 'pdf' : extension === 'docx' ? 'docx' : 'md';
        const doc: ApplicationDocumentation = { id: `${file.name}-${crypto.randomUUID()}`, name: file.name, type, size: file.size, uploadedAt: new Date().toISOString() };
        if (type === 'md') doc.content = await file.text();
        if (type === 'pdf') doc.url = URL.createObjectURL(file);
        return doc;
      })
    );
    setDocs((current) => [...current, ...parsedDocs]);
  };

  const onSubmit = (values: ApplicationForm) => {
    const slug = values.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const existing = applications.find((applicationItem) => applicationItem.id === editingId);
    const application: ManagedApplication = {
      ...(existing ?? {}),
      id: existing?.id ?? `custom_${crypto.randomUUID()}`,
      slug,
      name: values.name,
      category: values.category,
      description: values.description,
      longDescription: values.description,
      status: values.status,
      version: values.version,
      technologies: values.technologies.split(',').map((item) => item.trim()).filter(Boolean),
      gradient: 'from-cyan-300/50 via-amber-200/50 to-rose-300/50',
      logo: values.name.slice(0, 2).toUpperCase(),
      metrics: [{ label: 'Users', value: '0' }, { label: 'Requests', value: '0' }, { label: 'Uptime', value: 'New' }],
      features: ['Managed in SK Central', 'Documentation uploaded', 'Live preview configured'],
      roadmap: ['Add production analytics', 'Connect SSO', 'Publish release notes'],
      liveLink: values.liveLink,
      docs: docs.length ? docs : existing?.docs ?? [{ id: `${slug}-readme`, name: `${values.name} README.md`, type: 'md', uploadedAt: new Date().toISOString(), content: `# ${values.name}\n\n${values.description}\n\nLive link: ${values.liveLink}` }],
      analytics: existing?.analytics ?? fallbackMetrics,
      adminAnalytics: existing?.adminAnalytics
    };
    if (existing) updateApplication(application);
    else addApplication(application);
    reset();
    setDocs([]);
    setEditingId(null);
    setActiveTab('analytics');
  };

  const startEdit = (application: ManagedApplication) => {
    setEditingId(application.id);
    reset({
      name: application.name,
      category: application.category,
      liveLink: application.liveLink,
      version: application.version,
      status: application.status,
      technologies: application.technologies.join(', '),
      description: application.description
    });
    setDocs(application.docs);
  };

  return (
    <div className="space-y-4">
      <section className="glass rounded-[2rem] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-700">Smart Admin</p>
            <h1 className="mt-1 text-3xl font-black text-slate-950">Application Intelligence Center</h1>
            <p className="mt-1 text-sm text-slate-600">Track health, usage, errors, docs, and launch readiness across SK apps.</p>
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {adminTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn('inline-flex min-w-fit items-center gap-2 rounded-2xl px-3 py-2 text-xs font-black transition', activeTab === tab.id ? 'bg-slate-950 text-white' : 'bg-white/70 text-slate-600 hover:bg-white')}
              >
                <tab.icon size={15} /> {tab.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {activeTab === 'overview' ? (
        <>
          <section className="grid gap-3 md:grid-cols-4">
            {overviewStats.map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="glass rounded-[1.75rem] p-4">
                <span className={cn('grid h-10 w-10 place-items-center rounded-2xl', color)}><Icon size={18} /></span>
                <strong className="mt-3 block text-2xl text-slate-950">{value}</strong>
                <span className="text-xs font-black text-slate-500">{label}</span>
              </div>
            ))}
          </section>
          <section className="grid gap-4 xl:grid-cols-[1fr_420px]">
            <div className="glass rounded-[2rem] p-4">
              <h2 className="text-lg font-black text-slate-950">Traffic Trend</h2>
              <div className="mt-4 flex h-72 items-end gap-2 rounded-[1.5rem] bg-white/70 p-4">
                {trendHeights.map((height, index) => (
                  <div key={index} className="flex flex-1 items-end">
                    <div className={cn('w-full rounded-t-xl bg-gradient-to-t from-cyan-500 to-amber-300', height)} />
                  </div>
                ))}
              </div>
            </div>
            <div className="glass rounded-[2rem] p-4">
              <h2 className="text-lg font-black text-slate-950">Smart Signals</h2>
              <div className="mt-4 space-y-3">
                {[
                  ['Add analytics SDK', 'Install one tracking snippet in each app to stream page views, sessions, launches, and errors.'],
                  ['Server events', 'Send API latency, request counts, and exceptions from each backend into SK Central.'],
                  ['Realtime channel', 'Use Socket.IO or a queue worker to push fresh metrics into admin without refresh.']
                ].map(([title, body]) => (
                  <div key={title} className="rounded-2xl bg-white/75 p-4">
                    <strong className="text-sm text-slate-950">{title}</strong>
                    <p className="mt-1 text-xs leading-5 text-slate-600">{body}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </>
      ) : null}

      {activeTab === 'analytics' ? (
        <div className="space-y-4">
          <section className="glass rounded-[2rem] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-slate-950">Application Analytics Tabs</h2>
                <p className="text-xs text-slate-500">Select any application to inspect its respective analytics profile.</p>
              </div>
              <span className={cn('rounded-full px-3 py-1 text-xs font-black', liveSkQuiz?.connected ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800')}>
                SK Quiz realtime: {liveSkQuiz?.connected ? 'connected' : 'waiting'}
              </span>
            </div>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {applications.map((app) => (
                <button
                  key={app.id}
                  type="button"
                  onClick={() => setSelectedAnalyticsId(app.id)}
                  className={cn(
                    'min-w-fit rounded-2xl px-3 py-2 text-xs font-black transition',
                    selectedAnalyticsApp?.id === app.id ? 'bg-slate-950 text-white' : 'bg-white/75 text-slate-600 hover:bg-white'
                  )}
                >
                  {app.name}
                </button>
              ))}
            </div>
            {selectedAnalyticsApp ? (
              <div className="mt-3 grid gap-2 md:grid-cols-6">
                {[
                  ['Users', selectedAnalyticsApp.analytics.users],
                  ['Requests', selectedAnalyticsApp.analytics.requests],
                  ['Uptime', selectedAnalyticsApp.analytics.uptime],
                  ['Errors', selectedAnalyticsApp.analytics.errors],
                  ['Storage', selectedAnalyticsApp.analytics.storage],
                  ['Growth', selectedAnalyticsApp.analytics.growth]
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl bg-white/75 p-3">
                    <span className="text-[10px] font-black uppercase text-slate-500">{label}</span>
                    <strong className="mt-1 block text-sm text-slate-950">{value}</strong>
                  </div>
                ))}
              </div>
            ) : null}
            {liveSkQuiz ? <p className="mt-3 text-xs font-bold text-slate-500">{liveSkQuiz.message}</p> : null}
          </section>
          {analyticsProfiles.map((app) => {
            const profile = app.adminAnalytics!;
            return (
              <section key={app.id} className="glass rounded-[2rem] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-700">Fetched Local Project Analytics</p>
                    <h2 className="mt-1 text-2xl font-black text-slate-950">{app.name}</h2>
                    <p className="mt-1 text-sm text-slate-600">{profile.sourcePath}</p>
                  </div>
                  <span className="rounded-full bg-slate-950 px-3 py-1.5 text-xs font-black text-white">{profile.endpoint}</span>
                </div>

                <div className="mt-4 grid gap-3 xl:grid-cols-[1.15fr_0.85fr]">
                  <div className="rounded-[1.5rem] border border-slate-900/10 bg-white/75 p-3">
                    <h3 className="text-sm font-black text-slate-950">Summary Fields Available</h3>
                    <div className="mt-3 grid gap-2 md:grid-cols-2">
                      {profile.summaryFields.map((field) => (
                        <div key={field.key} className="rounded-2xl bg-slate-50 p-3">
                          <strong className="block text-sm text-slate-950">{field.label}</strong>
                          <span className="mt-1 block text-[11px] font-black uppercase text-cyan-700">{field.key}</span>
                          <p className="mt-1 text-xs leading-5 text-slate-600">{field.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="rounded-[1.5rem] border border-slate-900/10 bg-white/75 p-3">
                      <h3 className="text-sm font-black text-slate-950">Mongo Collections Used</h3>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {profile.collections.map((collection) => (
                          <span key={collection} className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-black text-cyan-800">{collection}</span>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-[1.5rem] border border-slate-900/10 bg-white/75 p-3">
                      <h3 className="text-sm font-black text-slate-950">Realtime Event Types</h3>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {profile.realtimeEvents.map((event) => (
                          <span key={event} className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800">{event}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-3 grid gap-3 lg:grid-cols-3">
                  <div className="rounded-[1.5rem] border border-slate-900/10 bg-white/75 p-3">
                    <h3 className="text-sm font-black text-slate-950">Admin Modal Tables</h3>
                    <div className="mt-2 space-y-2">
                      {profile.modelTables.map((table) => (
                        <div key={table.key} className="rounded-2xl bg-slate-50 p-3">
                          <strong className="text-sm text-slate-950">{table.label}</strong>
                          <p className="mt-1 text-xs text-slate-600">{table.columns.join(' · ')}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-[1.5rem] border border-slate-900/10 bg-white/75 p-3">
                    <h3 className="text-sm font-black text-slate-950">Rows And Distributions</h3>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {[...profile.rows, ...profile.distributions].map((item) => (
                        <span key={item} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">{item}</span>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-[1.5rem] border border-slate-900/10 bg-white/75 p-3">
                    <h3 className="text-sm font-black text-slate-950">Smart Insights Fetched</h3>
                    <div className="mt-2 space-y-2">
                      {profile.insights.map((insight) => (
                        <p key={insight} className="rounded-2xl bg-emerald-50 p-3 text-xs font-bold leading-5 text-emerald-800">{insight}</p>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            );
          })}

          <section className="grid gap-4 xl:grid-cols-2">
            {applications.map((app, index) => {
              const health = Math.max(72, 99 - numeric(app.analytics.errors) * 20 - index * 2);
              const healthWidth = healthWidths[index] ?? 'w-[76%]';
              return (
                <article key={app.id} className="glass rounded-[2rem] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-black text-slate-950">{app.name}</h2>
                      <p className="text-xs text-slate-500">{app.status} · {app.category}</p>
                    </div>
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">{Math.round(health)} health</span>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    {[
                      ['Users', app.analytics.users],
                      ['Requests', app.analytics.requests],
                      ['Errors', app.analytics.errors],
                      ['Uptime', app.analytics.uptime],
                      ['Storage', app.analytics.storage],
                      ['Growth', app.analytics.growth]
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-2xl bg-white/75 p-3">
                        <span className="text-[10px] font-black uppercase text-slate-500">{label}</span>
                        <strong className="mt-1 block text-sm text-slate-950">{value}</strong>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 h-2 rounded-full bg-slate-100">
                    <div className={cn('h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-400', healthWidth)} />
                  </div>
                </article>
              );
            })}
          </section>
        </div>
      ) : null}

      {activeTab === 'applications' ? (
        <section className="grid gap-4 xl:grid-cols-[520px_1fr]">
          <form onSubmit={handleSubmit(onSubmit)} className="glass rounded-[2rem] p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-lg font-black text-slate-950">
                {editingId ? <Save size={18} /> : <Plus size={18} />} {editingId ? 'Update Application' : 'Add Application'}
              </h2>
              {editingId ? (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setDocs([]);
                    reset({ status: 'Preview', version: '1.0.0', category: 'Application', liveLink: 'https://example.com' });
                  }}
                  className="rounded-xl bg-slate-100 px-3 py-1 text-xs font-black text-slate-700"
                >
                  Cancel
                </button>
              ) : null}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <input {...register('name', { required: true })} placeholder="Application name" className="rounded-2xl border-slate-200 text-sm" />
              <input {...register('category', { required: true })} placeholder="Category" className="rounded-2xl border-slate-200 text-sm" />
              <input {...register('liveLink', { required: true })} placeholder="Live link" className="rounded-2xl border-slate-200 text-sm sm:col-span-2" />
              <input {...register('version', { required: true })} placeholder="Version" className="rounded-2xl border-slate-200 text-sm" />
              <select {...register('status')} className="rounded-2xl border-slate-200 text-sm">{['Live', 'Beta', 'Preview', 'Planned'].map((status) => <option key={status}>{status}</option>)}</select>
              <input {...register('technologies')} placeholder="React, Node, MongoDB" className="rounded-2xl border-slate-200 text-sm sm:col-span-2" />
              <textarea {...register('description', { required: true })} placeholder="Description" rows={3} className="rounded-2xl border-slate-200 text-sm sm:col-span-2" />
            </div>
            <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white/70 p-4 text-sm font-black text-slate-600">
              <FileUp size={18} /> Upload .md, .pdf, .docx documentation
              <input type="file" multiple accept=".md,.pdf,.docx" className="hidden" onChange={onFiles} />
            </label>
            {docs.length ? <div className="mt-3 flex flex-wrap gap-2">{docs.map((doc) => <span key={doc.id} className="inline-flex items-center gap-2 rounded-full bg-cyan-100 px-3 py-1 text-xs font-black text-cyan-800">{doc.name}<button type="button" onClick={() => setDocs((current) => current.filter((item) => item.id !== doc.id))}><X size={12} /></button></span>)}</div> : null}
            <button className="mt-3 w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white" type="submit">
              {editingId ? 'Save Changes' : 'Add Application'}
            </button>
          </form>
          <div className="glass rounded-[2rem] p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-950">Live Link Preview</h2>
              <a href={liveLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-black text-cyan-700">Open <ExternalLink size={13} /></a>
            </div>
            <iframe title="Application first page preview" src={liveLink} className="h-[520px] w-full rounded-3xl border border-slate-900/10 bg-white" />
            <div className="mt-4 space-y-2">
              <h3 className="text-sm font-black text-slate-950">Manage Applications</h3>
              {applications.map((application) => (
                <div key={application.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white/75 p-3">
                  <div className="min-w-0">
                    <strong className="block truncate text-sm text-slate-950">{application.name}</strong>
                    <span className="block truncate text-xs text-slate-500">{application.liveLink}</span>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => startEdit(application)} className="rounded-xl bg-cyan-100 p-2 text-cyan-700" aria-label={`Edit ${application.name}`}>
                      <Pencil size={15} />
                    </button>
                    <button type="button" onClick={() => deleteApplication(application.id)} className="rounded-xl bg-rose-100 p-2 text-rose-700" aria-label={`Delete ${application.name}`}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {!['overview', 'applications', 'analytics'].includes(activeTab) ? (
        <section className="glass rounded-[2rem] p-4">
          <h2 className="flex items-center gap-2 text-lg font-black capitalize text-slate-950"><Bot size={18} /> {activeTab}</h2>
          <div className="mt-3 grid gap-2 md:grid-cols-4">
            {applications.slice(0, 4).map((app) => <div key={app.id} className="rounded-2xl bg-white/70 p-3"><strong className="text-sm text-slate-950">{app.name}</strong><p className="mt-1 text-xs text-slate-500">{app.status} · {app.analytics.requests} requests</p></div>)}
          </div>
        </section>
      ) : null}
    </div>
  );
}
