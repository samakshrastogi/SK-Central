import { useEffect, useMemo, useRef, useState } from 'react';
import { BarChart3, BookOpenCheck, Brain, Clock, FileQuestion, Gauge, GraduationCap, LogIn, MousePointerClick, Target, UsersRound } from 'lucide-react';
import { api } from '@/services/api';
import { useApplicationStore } from '@/store/applicationStore';

interface IdentityUserRow {
  _id: string;
  name: string;
  email: string;
  role: string;
}

interface ActivityRow {
  platform: string;
  type: 'login' | 'visit' | 'active_time';
  dateKey: string;
  durationSeconds?: number;
  userId?: IdentityUserRow;
  createdAt?: string;
}

interface IdentityAnalytics {
  users: IdentityUserRow[];
  activities: ActivityRow[];
}

interface SkQuizIntegrationState {
  connected: boolean;
  message: string;
  data: unknown;
}

interface SkQuizMetric {
  label: string;
  value: string | number;
  hint: string;
  icon: typeof BarChart3;
}

const getRecord = (value: unknown): Record<string, unknown> => (value && typeof value === 'object' ? value as Record<string, unknown> : {});

const mergeMetricSources = (value: unknown, keys: string[]) => {
  const root = getRecord(value);
  return keys.reduce<Record<string, unknown>>((accumulator, key) => {
    const nested = getRecord(root[key]);
    return { ...accumulator, ...nested };
  }, { ...root });
};

const pickNumber = (source: Record<string, unknown>, keys: string[], fallback = 0) => {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
      const parsed = Number(value.replace(/[% ,]/g, ''));
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return fallback;
};

const getRows = (value: unknown): Array<Record<string, unknown>> => Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object")) : [];

const pickString = (source: Record<string, unknown>, keys: string[], fallback: string) => {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value.trim()) return value;
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return fallback;
};


const buildVisitRows = (activities: ActivityRow[], platform: string) => {
  const grouped = new Map<string, { user: string; email: string; date: string; count: number; buckets: Set<string> }>();
  activities.filter((item) => item.type === 'visit' && item.platform === platform).forEach((item) => {
    const user = item.userId?.name ?? 'Unknown';
    const email = item.userId?.email ?? '';
    const createdAt = item.createdAt ? new Date(item.createdAt).getTime() : Number.NaN;
    const tenMinuteBucket = Number.isFinite(createdAt) ? String(Math.floor(createdAt / 600_000)) : item.dateKey;
    const key = `${user}-${email}-${item.dateKey}`;
    const row = grouped.get(key) ?? { user, email, date: item.dateKey, count: 0, buckets: new Set<string>() };
    row.buckets.add(tenMinuteBucket);
    row.count = row.buckets.size;
    grouped.set(key, row);
  });
  return [...grouped.values()].map((row) => ({ user: row.user, email: row.email, date: row.date, count: row.count }));
};

const formatDuration = (seconds: number) => {
  const safe = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const rest = safe % 60;
  return `${hours}h ${minutes}m ${rest}s`;
};

export default function AnalyticsPage() {
  const [data, setData] = useState<IdentityAnalytics>({ users: [], activities: [] });
  const [skQuiz, setSkQuiz] = useState<SkQuizIntegrationState>({ connected: false, message: 'Waiting for SK Quiz analytics.', data: null });
  const [connectedInsights, setConnectedInsights] = useState<Record<string, SkQuizIntegrationState>>({});
  const [activeProject, setActiveProject] = useState('sk-central');
  const [activeModal, setActiveModal] = useState<'users' | 'logins' | 'quizVisits' | 'mailpilotVisits' | 'chatVisits' | 'mediaflowVisits' | 'time' | null>(null);
  const [liveTick, setLiveTick] = useState(Date.now());
  const sessionStartedAt = useRef(Date.now());
  const initialActiveSeconds = useRef<number | null>(null);
  const applications = useApplicationStore((state) => state.applications);
  const projectTabs = useMemo(() => {
    const slugs = ['sk-central', 'sk-quiz', 'sk-mailpilot', 'sk-chat', 'sk-mediaflow', ...applications.map((app) => app.slug)]
      .map((slug) => slug === 'sk-quiz-coach' ? 'sk-quiz' : slug === 'sk-connect' ? 'sk-chat' : slug);
    return [...new Set(slugs)];
  }, [applications]);

  useEffect(() => {
    const load = async () => {
      const response = await api.get('/auth/identity-analytics');
      setData(response.data.data);
      if (initialActiveSeconds.current === null) {
        initialActiveSeconds.current = (response.data.data.activities as ActivityRow[])
          .filter((item) => item.type === 'active_time')
          .reduce((sum, item) => sum + (item.durationSeconds ?? 0), 0);
      }
    };
    void load();
    const interval = window.setInterval(load, 30_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const load = async () => {
      const response = await api.get('/integrations/sk-quiz/admin-analytics');
      setSkQuiz(response.data.data);
    };
    void load();
    const interval = window.setInterval(load, 30_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const projects = ["sk-mailpilot", "sk-chat", "sk-mediaflow"];
    const load = async () => {
      const results = await Promise.all(projects.map(async (project) => {
        try {
          const response = await api.get(`/integrations/${project}/admin-analytics`);
          return [project, response.data.data as SkQuizIntegrationState] as const;
        } catch (error) {
          return [project, { connected: false, message: error instanceof Error ? error.message : "Unable to load live analytics.", data: null }] as const;
        }
      }));
      setConnectedInsights(Object.fromEntries(results));
    };
    void load();
    const interval = window.setInterval(load, 30_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => setLiveTick(Date.now()), 1_000);
    return () => window.clearInterval(interval);
  }, []);

  const loginRows = useMemo(() => {
    const grouped = new Map<string, { user: string; email: string; date: string; count: number }>();
    data.activities.filter((item) => item.type === 'login').forEach((item) => {
      const user = item.userId?.name ?? 'Unknown';
      const email = item.userId?.email ?? '';
      const key = `${user}-${item.dateKey}`;
      const row = grouped.get(key) ?? { user, email, date: item.dateKey, count: 0 };
      row.count += 1;
      grouped.set(key, row);
    });
    return [...grouped.values()];
  }, [data.activities]);

  const activeTimeRows = useMemo(() => {
    const grouped = new Map<string, { user: string; email: string; platform: string; date: string; seconds: number }>();
    data.activities.filter((item) => item.type === 'active_time').forEach((item) => {
      const user = item.userId?.name ?? 'Unknown';
      const email = item.userId?.email ?? '';
      const key = `${user}-${item.platform}-${item.dateKey}`;
      const row = grouped.get(key) ?? { user, email, platform: item.platform, date: item.dateKey, seconds: 0 };
      row.seconds += item.durationSeconds ?? 0;
      grouped.set(key, row);
    });
    return [...grouped.values()];
  }, [data.activities]);

  const quizVisitRows = useMemo(() => buildVisitRows(data.activities, 'sk-quiz'), [data.activities]);
  const mailpilotVisitRows = useMemo(() => buildVisitRows(data.activities, 'sk-mailpilot'), [data.activities]);
  const chatVisitRows = useMemo(() => buildVisitRows(data.activities, 'sk-chat'), [data.activities]);
  const mediaflowVisitRows = useMemo(() => buildVisitRows(data.activities, 'sk-mediaflow'), [data.activities]);

  const loginDateColumns = useMemo(() => {
    return [...new Set(loginRows.map((row) => row.date))].sort((a, b) => b.localeCompare(a));
  }, [loginRows]);

  const loginPivotRows = useMemo(() => {
    const grouped = new Map<string, { user: string; email: string; counts: Record<string, number> }>();
    loginRows.forEach((row) => {
      const key = `${row.email}-${row.user}`;
      const current = grouped.get(key) ?? { user: row.user, email: row.email, counts: {} };
      current.counts[row.date] = (current.counts[row.date] ?? 0) + row.count;
      grouped.set(key, current);
    });

    return [...grouped.values()].map((row, index) => [
      index + 1,
      row.user,
      row.email,
      ...loginDateColumns.map((date) => row.counts[date] ?? 0)
    ]);
  }, [loginDateColumns, loginRows]);

  const quizVisitDateColumns = useMemo(() => {
    return [...new Set(quizVisitRows.map((row) => row.date))].sort((a, b) => b.localeCompare(a));
  }, [quizVisitRows]);

  const quizVisitPivotRows = useMemo(() => {
    const grouped = new Map<string, { user: string; email: string; counts: Record<string, number> }>();
    quizVisitRows.forEach((row) => {
      const key = `${row.email}-${row.user}`;
      const current = grouped.get(key) ?? { user: row.user, email: row.email, counts: {} };
      current.counts[row.date] = (current.counts[row.date] ?? 0) + row.count;
      grouped.set(key, current);
    });

    return [...grouped.values()].map((row, index) => [
      index + 1,
      row.user,
      row.email,
      ...quizVisitDateColumns.map((date) => row.counts[date] ?? 0)
    ]);
  }, [quizVisitDateColumns, quizVisitRows]);


  const mailpilotVisitDateColumns = useMemo(() => {
    return [...new Set(mailpilotVisitRows.map((row) => row.date))].sort((a, b) => b.localeCompare(a));
  }, [mailpilotVisitRows]);

  const mailpilotVisitPivotRows = useMemo(() => {
    const grouped = new Map<string, { user: string; email: string; counts: Record<string, number> }>();
    mailpilotVisitRows.forEach((row) => {
      const key = `${row.email}-${row.user}`;
      const current = grouped.get(key) ?? { user: row.user, email: row.email, counts: {} };
      current.counts[row.date] = (current.counts[row.date] ?? 0) + row.count;
      grouped.set(key, current);
    });
    return [...grouped.values()].map((row, index) => [
      index + 1,
      row.user,
      row.email,
      ...mailpilotVisitDateColumns.map((date) => row.counts[date] ?? 0)
    ]);
  }, [mailpilotVisitDateColumns, mailpilotVisitRows]);
  const chatVisitDateColumns = useMemo(() => [...new Set(chatVisitRows.map((row) => row.date))].sort((a, b) => b.localeCompare(a)), [chatVisitRows]);
  const chatVisitPivotRows = useMemo(() => {
    const grouped = new Map<string, { user: string; email: string; counts: Record<string, number> }>();
    chatVisitRows.forEach((row) => {
      const key = `${row.email}-${row.user}`;
      const current = grouped.get(key) ?? { user: row.user, email: row.email, counts: {} };
      current.counts[row.date] = (current.counts[row.date] ?? 0) + row.count;
      grouped.set(key, current);
    });
    return [...grouped.values()].map((row, index) => [index + 1, row.user, row.email, ...chatVisitDateColumns.map((date) => row.counts[date] ?? 0)]);
  }, [chatVisitDateColumns, chatVisitRows]);

  const mediaflowVisitDateColumns = useMemo(() => [...new Set(mediaflowVisitRows.map((row) => row.date))].sort((a, b) => b.localeCompare(a)), [mediaflowVisitRows]);
  const mediaflowVisitPivotRows = useMemo(() => {
    const grouped = new Map<string, { user: string; email: string; counts: Record<string, number> }>();
    mediaflowVisitRows.forEach((row) => {
      const key = `${row.email}-${row.user}`;
      const current = grouped.get(key) ?? { user: row.user, email: row.email, counts: {} };
      current.counts[row.date] = (current.counts[row.date] ?? 0) + row.count;
      grouped.set(key, current);
    });
    return [...grouped.values()].map((row, index) => [index + 1, row.user, row.email, ...mediaflowVisitDateColumns.map((date) => row.counts[date] ?? 0)]);
  }, [mediaflowVisitDateColumns, mediaflowVisitRows]);
  const activeTimeDateColumns = useMemo(() => {
    return [...new Set(activeTimeRows.map((row) => row.date))].sort((a, b) => b.localeCompare(a));
  }, [activeTimeRows]);

  const activeTimePivotRows = useMemo(() => {
    const grouped = new Map<string, { user: string; email: string; platform: string; seconds: Record<string, number> }>();
    activeTimeRows.forEach((row) => {
      const key = `${row.email}-${row.user}-${row.platform}`;
      const current = grouped.get(key) ?? { user: row.user, email: row.email, platform: row.platform, seconds: {} };
      current.seconds[row.date] = (current.seconds[row.date] ?? 0) + row.seconds;
      grouped.set(key, current);
    });

    return [...grouped.values()].map((row, index) => [
      index + 1,
      row.user,
      row.email,
      row.platform,
      ...activeTimeDateColumns.map((date) => formatDuration(row.seconds[date] ?? 0))
    ]);
  }, [activeTimeDateColumns, activeTimeRows]);

  const storedActiveSeconds = activeTimeRows.reduce((sum, row) => sum + row.seconds, 0);
  const activeUserCount = Math.max(1, new Set(activeTimeRows.map((row) => row.email || row.user)).size || data.users.length || 1);
  const sessionElapsedSeconds = document.visibilityState === 'visible' ? Math.max(0, Math.floor((liveTick - sessionStartedAt.current) / 1000)) : 0;
  const liveActiveSeconds = Math.max(storedActiveSeconds, (initialActiveSeconds.current ?? storedActiveSeconds) + sessionElapsedSeconds);
  const averageActiveSeconds = Math.floor(liveActiveSeconds / activeUserCount);
  const cards = [
    { label: 'Unique Users', value: data.users.length, icon: UsersRound, modal: 'users' as const },
    { label: 'Login Events', value: loginRows.reduce((sum, row) => sum + row.count, 0), icon: LogIn, modal: 'logins' as const },
    { label: 'Avg Active Time', value: formatDuration(averageActiveSeconds), icon: Clock, modal: 'time' as const },
    { label: 'SK Quiz Visits', value: quizVisitRows.reduce((sum, row) => sum + row.count, 0), icon: MousePointerClick, modal: 'quizVisits' as const },
    { label: 'SK Mailpilot Visits', value: mailpilotVisitRows.reduce((sum, row) => sum + row.count, 0), icon: MousePointerClick, modal: 'mailpilotVisits' as const },
    { label: 'SK Chat Visits', value: chatVisitRows.reduce((sum, row) => sum + row.count, 0), icon: MousePointerClick, modal: 'chatVisits' as const },
    { label: 'SK MediaFlow Visits', value: mediaflowVisitRows.reduce((sum, row) => sum + row.count, 0), icon: MousePointerClick, modal: 'mediaflowVisits' as const }
  ];
  const modalMap = {
    users: {
      title: 'Unique Users',
      columns: ['S.no.', 'User name', 'Email ID'],
      rows: data.users.map((user, index) => [index + 1, user.name, user.email]),
      footer: `Total users: ${data.users.length}`
    },
    logins: {
      title: 'Login Count',
      columns: ['S.no.', 'Users', 'Email ID', ...loginDateColumns],
      rows: loginPivotRows,
      footer: `Total logins: ${loginRows.reduce((sum, row) => sum + row.count, 0)}`
    },
    time: {
      title: 'Average Active Time',
      columns: ['S.no.', 'Users', 'Email ID', 'Platform', ...activeTimeDateColumns],
      rows: activeTimePivotRows,
      footer: `Average active time: ${formatDuration(averageActiveSeconds)} - Total active time: ${formatDuration(liveActiveSeconds)}`
    },
    quizVisits: {
      title: 'SK Quiz Visits',
      columns: ['S.no.', 'Users', 'Email ID', ...quizVisitDateColumns],
      rows: quizVisitPivotRows,
      footer: `Visits count once per user every 10 minutes. Total visits: ${quizVisitRows.reduce((sum, row) => sum + row.count, 0)}`
    },
    mailpilotVisits: {
      title: 'SK Mailpilot Visits',
      columns: ['S.no.', 'Users', 'Email ID', ...mailpilotVisitDateColumns],
      rows: mailpilotVisitPivotRows,
      footer: `Visits count once per user every 10 minutes. Total visits: ${mailpilotVisitRows.reduce((sum, row) => sum + row.count, 0)}`
    },
    chatVisits: {
      title: 'SK Chat Visits',
      columns: ['S.no.', 'Users', 'Email ID', ...chatVisitDateColumns],
      rows: chatVisitPivotRows,
      footer: `Visits count once per user every 10 minutes. Total visits: ${chatVisitRows.reduce((sum, row) => sum + row.count, 0)}`
    },
    mediaflowVisits: {
      title: 'SK MediaFlow Visits',
      columns: ['S.no.', 'Users', 'Email ID', ...mediaflowVisitDateColumns],
      rows: mediaflowVisitPivotRows,
      footer: `Visits count once per user every 10 minutes. Total visits: ${mediaflowVisitRows.reduce((sum, row) => sum + row.count, 0)}`
    }
  };

  return (
    <div className="space-y-4">
      <section className="glass rounded-[2rem] p-5">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-700">Smart Analytics</p>
        <h1 className="mt-1 text-3xl font-black text-slate-950">SK Intelligence Dashboard</h1>
        <p className="mt-1 text-sm font-semibold text-slate-500">Central identity, platform usage, SK Quiz, SK Mailpilot, SK Chat, and SK MediaFlow visits, and application-level analytics.</p>
        <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" /> Live · synced automatically</div>
        <div className="mt-4 flex gap-2 overflow-x-auto">
          {projectTabs.map((project) => (
            <button key={project} type="button" onClick={() => setActiveProject(project)} className={`rounded-2xl px-4 py-2 text-xs font-black ${activeProject === project ? 'bg-slate-950 text-white' : 'bg-white/80 text-slate-600'}`}>
              {project}
            </button>
          ))}
        </div>
      </section>

      {activeProject === 'sk-central' ? (
        <>
          <section className="space-y-2">
            <div className="grid gap-2 md:grid-cols-3">
              {cards.slice(0, 3).map(({ label, value, icon: Icon, modal }) => (
                <button key={label} type="button" onClick={() => setActiveModal(modal)} className="glass flex min-h-20 items-center gap-3 rounded-[1.4rem] p-3 text-left transition hover:-translate-y-0.5 hover:shadow-xl">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-cyan-100 text-cyan-700"><Icon size={18} /></span>
                  <span className="min-w-0">
                    <strong className="block truncate text-xl text-slate-950">{value}</strong>
                    <span className="block truncate text-xs font-black text-slate-500">{label}</span>
                  </span>
                </button>
              ))}
            </div>
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
              {cards.slice(3).map(({ label, value, icon: Icon, modal }) => (
                <button key={label} type="button" onClick={() => setActiveModal(modal)} className="glass flex min-h-20 items-center gap-3 rounded-[1.4rem] p-3 text-left transition hover:-translate-y-0.5 hover:shadow-xl">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-cyan-100 text-cyan-700"><Icon size={18} /></span>
                  <span className="min-w-0">
                    <strong className="block truncate text-xl text-slate-950">{value}</strong>
                    <span className="block truncate text-xs font-black text-slate-500">{label}</span>
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="glass rounded-[2rem] p-5">
            <h2 className="flex items-center gap-2 text-xl font-black text-slate-950"><BarChart3 size={20} /> Central identity intelligence</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
              SK Central owns identity-wide analytics only: unique users, login events, cross-platform active time, SK Quiz, SK Mailpilot, SK Chat, and SK MediaFlow visit handoffs, notification activity, sessions, and role changes.
            </p>
          </section>
        </>
      ) : activeProject === 'sk-quiz' ? (
        <QuizIntelligencePanel state={skQuiz} />
      ) : (
        <ConnectedApplicationPanel project={activeProject} state={connectedInsights[activeProject]} />
      )}
      {activeModal ? <AnalyticsModal {...modalMap[activeModal]} onClose={() => setActiveModal(null)} /> : null}
    </div>
  );
}

function AnalyticsModal({ title, columns, rows, footer, onClose }: { title: string; columns: string[]; rows: Array<Array<string | number>>; footer?: string; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const filteredRows = rows.filter((row) => row.join(' ').toLowerCase().includes(query.toLowerCase()));
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/35 p-4 backdrop-blur-sm" onMouseDown={onClose}>
      <div className="glass max-h-[86vh] w-full max-w-5xl overflow-hidden rounded-[2rem]" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-900/10 p-4">
          <div>
            <h2 className="text-xl font-black text-slate-950">{title}</h2>
            <p className="text-xs font-bold text-slate-500">{footer}</p>
          </div>
          <div className="flex items-center gap-2">
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search table" className="h-10 rounded-2xl border-slate-200 text-sm" />
            <button type="button" onClick={onClose} className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-black text-white">Close</button>
          </div>
        </div>
        <div className="max-h-[62vh] overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-white/90 text-xs font-black uppercase text-slate-500 backdrop-blur">
              <tr>{columns.map((column) => <th key={column} className="px-4 py-3">{column}</th>)}</tr>
            </thead>
            <tbody>
              {filteredRows.length ? filteredRows.map((row, rowIndex) => (
                <tr key={rowIndex} className="border-t border-slate-900/5">
                  {row.map((cell, cellIndex) => <td key={`${rowIndex}-${cellIndex}`} className="px-4 py-3 font-bold text-slate-700">{cell}</td>)}
                </tr>
              )) : (
                <tr><td className="px-4 py-6 text-sm font-bold text-slate-500" colSpan={columns.length}>No matching data.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {footer ? <div className="border-t border-slate-900/10 bg-white/60 px-4 py-3 text-sm font-black text-slate-950">{footer}</div> : null}
      </div>
    </div>
  );
}

interface CompactMetric { label: string; value: string | number; hint: string }

function LivePanelHeader({ connected, message, title, subtitle }: { connected: boolean; message: string; title: string; subtitle: string }) {
  return <div className="flex flex-wrap items-start justify-between gap-3">
    <div><h2 className="flex items-center gap-2 text-xl font-black text-slate-950"><BarChart3 size={20} /> {title}</h2><p className="mt-1 max-w-4xl text-sm font-semibold leading-6 text-slate-500">{subtitle}</p></div>
    <span className={`rounded-full px-3 py-1 text-xs font-black ${connected ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"}`}>{connected ? "Live data" : "Connection pending"}</span>
    {!connected && message ? <p className="w-full rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900">{message}</p> : null}
  </div>;
}

function CompactMetrics({ metrics }: { metrics: CompactMetric[] }) {
  return <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">{metrics.map((metric) => <div key={metric.label} className="rounded-[1.2rem] border border-slate-900/5 bg-white/70 p-3 shadow-sm"><strong className="block text-xl text-slate-950">{metric.value}</strong><span className="block text-xs font-black text-slate-600">{metric.label}</span><p className="mt-1 text-[11px] font-semibold leading-4 text-slate-500">{metric.hint}</p></div>)}</div>;
}

function MiniBars({ rows, valueKey = "count" }: { rows: Array<Record<string, unknown>>; valueKey?: string }) {
  const max = Math.max(1, ...rows.map((row) => pickNumber(row, [valueKey], 0)));
  return <div className="space-y-2">{rows.map((row, index) => { const value = pickNumber(row, [valueKey], 0); return <div key={`${String(row.label ?? row.confidence ?? index)}-${index}`}><div className="flex justify-between gap-3 text-xs font-bold text-slate-600"><span>{String(row.label ?? row.confidence ?? "Unknown")}</span><span>{value}{valueKey.toLowerCase().includes("rate") || valueKey === "accuracy" ? "%" : ""}</span></div><div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-cyan-500" style={{ width: `${Math.max(2, (value / max) * 100)}%` }} /></div></div>; })}</div>;
}

function QuizIntelligencePanel({ state }: { state: SkQuizIntegrationState }) {
  const root = getRecord(state.data);
  const summary = getRecord(root.summary);
  const intelligence = getRecord(root.learningIntelligence);
  const funnel = getRows(intelligence.onboardingFunnel);
  const gamification = getRecord(intelligence.gamification);
  const inactivity = getRecord(intelligence.inactivity);
  const compliance = getRecord(intelligence.planCompliance);
  const subjectRows = getRows(intelligence.subjectTimeInvestment);
  const outliers = getRows(intelligence.questionOutliers);
  const confidence = getRows(intelligence.confidenceAccuracy);
  const quizFunnel = getRecord(intelligence.quizFunnel);
  const quizStatuses = getRecord(quizFunnel.statuses);
  const metrics: CompactMetric[] = [
    { label: "Learners", value: pickNumber(summary, ["userCount"], 0), hint: "Registered SK Quiz accounts" },
    { label: "Reached first quiz", value: funnel.at(-1)?.count as number ?? 0, hint: "End-to-end onboarding conversion" },
    { label: "Average streak", value: `${pickNumber(gamification, ["averageStreak"], 0)} days`, hint: "Current learner consistency" },
    { label: "Inactive 7+ days", value: pickNumber(inactivity, ["inactive7d"], 0), hint: "Re-engagement cohort" },
    { label: "Carry-forward rate", value: `${pickNumber(compliance, ["carryForwardRate"], 0)}%`, hint: "Due tasks still incomplete" },
    { label: "Quiz abandonment", value: `${pickNumber(quizFunnel, ["abandonmentRate"], 0)}%`, hint: "In-progress or cancelled sessions" }
  ];
  return <section className="glass rounded-[2rem] p-4 sm:p-5">
    <LivePanelHeader connected={state.connected} message={state.message} title="SK Quiz learning intelligence" subtitle="Live learner progression, planning compliance, question quality, confidence calibration, and quiz completion signals." />
    <CompactMetrics metrics={metrics} />
    <div className="mt-4 grid gap-3 xl:grid-cols-3">
      <section className="rounded-[1.3rem] border border-slate-900/5 bg-white/60 p-4 xl:col-span-2"><h3 className="text-sm font-black text-slate-950">Onboarding funnel</h3><div className="mt-3 grid gap-2 sm:grid-cols-5">{funnel.map((stage) => <div key={String(stage.key)} className="rounded-xl bg-slate-50 p-3"><strong className="text-lg text-slate-950">{String(stage.count ?? 0)}</strong><span className="block text-[11px] font-black text-slate-600">{String(stage.label ?? "Stage")}</span><span className="mt-1 block text-[10px] font-bold text-cyan-700">{String(stage.conversionRate ?? 0)}% from prior</span></div>)}</div></section>
      <section className="rounded-[1.3rem] border border-slate-900/5 bg-white/60 p-4"><h3 className="text-sm font-black text-slate-950">Inactivity cohorts</h3><div className="mt-3 grid grid-cols-2 gap-2">{[["No study plan", "signedUpNoPlan"], ["Plan, no quiz", "planButNoQuiz"], ["Inactive 7 days", "inactive7d"], ["Inactive 30 days", "inactive30d"]].map(([label, key]) => <div key={key} className="rounded-xl bg-slate-50 p-2"><strong className="block text-lg">{pickNumber(inactivity, [key], 0)}</strong><span className="text-[10px] font-black text-slate-500">{label}</span></div>)}</div></section>
    </div>
    <div className="mt-3 grid gap-3 lg:grid-cols-3">
      <section className="rounded-[1.3rem] border border-slate-900/5 bg-white/60 p-4"><h3 className="text-sm font-black">Streak distribution</h3><div className="mt-3"><MiniBars rows={getRows(gamification.streakDistribution)} /></div></section>
      <section className="rounded-[1.3rem] border border-slate-900/5 bg-white/60 p-4"><h3 className="text-sm font-black">Level distribution</h3><div className="mt-3"><MiniBars rows={getRows(gamification.levelDistribution)} /></div></section>
      <section className="rounded-[1.3rem] border border-slate-900/5 bg-white/60 p-4"><h3 className="text-sm font-black">XP distribution</h3><div className="mt-3"><MiniBars rows={getRows(gamification.xpDistribution)} /></div></section>
    </div>
    <div className="mt-3 grid gap-3 xl:grid-cols-2">
      <section className="overflow-hidden rounded-[1.3rem] border border-slate-900/5 bg-white/60"><div className="p-4"><h3 className="text-sm font-black">Study plan compliance by subject</h3><p className="text-xs font-semibold text-slate-500">Planned hours compared with tracked active study time.</p></div><div className="max-h-64 overflow-auto"><table className="w-full text-left text-xs"><thead className="sticky top-0 bg-white"><tr><th className="px-4 py-2">Subject</th><th>Planned</th><th>Active</th><th>Done</th></tr></thead><tbody>{subjectRows.map((row) => <tr key={String(row.subject)} className="border-t border-slate-900/5"><td className="px-4 py-2 font-bold">{String(row.subject)}</td><td>{String(row.plannedHours)}h</td><td>{String(row.actualHours)}h</td><td>{String(row.completionRate)}%</td></tr>)}</tbody></table></div></section>
      <section className="overflow-hidden rounded-[1.3rem] border border-slate-900/5 bg-white/60"><div className="p-4"><h3 className="text-sm font-black">Question-bank outliers</h3><p className="text-xs font-semibold text-slate-500">Easy questions below 30% accuracy and hard questions above 95%.</p></div><div className="max-h-64 overflow-auto"><table className="w-full text-left text-xs"><thead className="sticky top-0 bg-white"><tr><th className="px-4 py-2">Question</th><th>Difficulty</th><th>Attempts</th><th>Accuracy</th></tr></thead><tbody>{outliers.length ? outliers.map((row) => <tr key={String(row.questionId)} className="border-t border-slate-900/5"><td className="max-w-56 px-4 py-2 font-bold">{String(row.question)}</td><td>{String(row.difficulty)}</td><td>{String(row.attempts)}</td><td>{String(row.accuracy)}%</td></tr>) : <tr><td colSpan={4} className="px-4 py-5 font-bold text-emerald-700">No suspicious difficulty outliers detected.</td></tr>}</tbody></table></div></section>
    </div>
    <div className="mt-3 grid gap-3 lg:grid-cols-2"><section className="rounded-[1.3rem] border border-slate-900/5 bg-white/60 p-4"><h3 className="text-sm font-black">Confidence vs accuracy</h3><div className="mt-3"><MiniBars rows={confidence} valueKey="accuracy" /></div></section><section className="rounded-[1.3rem] border border-slate-900/5 bg-white/60 p-4"><h3 className="text-sm font-black">Quiz session funnel</h3><div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">{Object.entries(quizStatuses).map(([status, value]) => <div key={status} className="rounded-xl bg-slate-50 p-2"><strong className="block text-lg">{String(value)}</strong><span className="text-[10px] font-black uppercase text-slate-500">{status.replaceAll("_", " ")}</span></div>)}</div></section></div>
  </section>;
}

function ConnectedApplicationPanel({ project, state }: { project: string; state?: SkQuizIntegrationState }) {
  const root = getRecord(state?.data);
  const connected = Boolean(state?.connected);
  if (project === "sk-mailpilot") {
    const summary = getRecord(root.summary); const health = getRecord(root.health);
    const metrics: CompactMetric[] = [{ label: "Users", value: pickNumber(summary, ["users"], 0), hint: "MailPilot accounts" }, { label: "Connected mailboxes", value: pickNumber(summary, ["activeMailboxes"], 0), hint: "Active Gmail connections" }, { label: "Processed emails", value: pickNumber(summary, ["processedEmails"], 0), hint: "Indexed active mail" }, { label: "Pending replies", value: pickNumber(summary, ["pendingReplies"], 0), hint: "Messages needing action" }, { label: "Overdue replies", value: pickNumber(summary, ["overdueReplies"], 0), hint: "Reply SLA at risk" }, { label: "Sync health", value: `${pickNumber(health, ["syncSuccessRate"], 0)}%`, hint: "Successful mailbox syncs" }];
    return <section className="glass rounded-[2rem] p-4 sm:p-5"><LivePanelHeader connected={connected} message={state?.message ?? "Loading SK MailPilot analytics."} title="SK MailPilot operations" subtitle="Live mailbox adoption, processing throughput, reply workload, scheduling, and synchronization health." /><CompactMetrics metrics={metrics} /><div className="mt-3 grid gap-3 lg:grid-cols-2"><section className="rounded-[1.3rem] bg-white/60 p-4"><h3 className="text-sm font-black">Email categories</h3><div className="mt-3"><MiniBars rows={getRows(root.categoryDistribution)} valueKey="value" /></div></section><section className="grid grid-cols-2 gap-2 rounded-[1.3rem] bg-white/60 p-4">{[["Recent 7 days", "recentEmails"], ["High priority", "highPriority"], ["Scheduled", "scheduled"], ["Sent", "sent"], ["Failed", "failed"], ["Pending approvals", "pendingApprovals"]].map(([label, key]) => <div key={key} className="rounded-xl bg-slate-50 p-3"><strong className="block text-lg">{pickNumber(summary, [key], 0)}</strong><span className="text-[10px] font-black text-slate-500">{label}</span></div>)}</section></div></section>;
  }
  if (project === "sk-chat") {
    const users = getRecord(root.users); const messages = getRecord(root.messages); const chats = getRecord(root.chats); const communities = getRecord(root.communities); const sessions = getRecord(root.sessions); const charts = getRecord(root.charts);
    const metrics: CompactMetric[] = [{ label: "Users", value: pickNumber(users, ["total"], 0), hint: "Registered members" }, { label: "Verified", value: pickNumber(users, ["verified"], 0), hint: "Verified accounts" }, { label: "Online now", value: pickNumber(users, ["online"], 0), hint: "Current presence" }, { label: "Messages", value: pickNumber(messages, ["total"], 0), hint: "Messages created" }, { label: "Conversations", value: pickNumber(chats, ["total"], 0), hint: "Direct and group chats" }, { label: "Communities", value: pickNumber(communities, ["total"], 0), hint: "Community spaces" }];
    return <section className="glass rounded-[2rem] p-4 sm:p-5"><LivePanelHeader connected={connected} message={state?.message ?? "Loading SK Chat analytics."} title="SK Chat engagement" subtitle="Live account adoption, conversation volume, communities, message throughput, and active sessions." /><CompactMetrics metrics={metrics} /><div className="mt-3 grid gap-3 lg:grid-cols-[2fr_1fr]"><section className="rounded-[1.3rem] bg-white/60 p-4"><h3 className="text-sm font-black">Message volume · last 7 days</h3><div className="mt-3"><MiniBars rows={getRows(charts.messagesOverTime).map((row) => ({ label: row._id, count: row.count }))} /></div></section><section className="rounded-[1.3rem] bg-white/60 p-4"><strong className="block text-3xl">{pickNumber(sessions, ["active"], 0)}</strong><span className="text-xs font-black text-slate-500">Active device sessions</span></section></div></section>;
  }
  const cards = getRecord(root.cards); const activity = getRecord(root.userActivity); const watch = getRecord(root.watchMetrics); const invites = getRecord(root.inviteFunnel);
  const metrics: CompactMetric[] = [{ label: "Unique users", value: pickNumber(cards, ["uniqueUsers"], 0), hint: "Accounts using MediaFlow" }, { label: "Total logins", value: pickNumber(cards, ["totalLogins"], 0), hint: "Authentication activity" }, { label: "DAU / WAU", value: `${pickNumber(activity, ["dau"], 0)} / ${pickNumber(activity, ["wau"], 0)}`, hint: "Daily and weekly active" }, { label: "MAU", value: pickNumber(activity, ["mau"], 0), hint: "Monthly active users" }, { label: "Watch time", value: formatDuration(pickNumber(watch, ["totalWatchSeconds"], 0)), hint: "Total video consumption" }, { label: "Completion", value: `${pickNumber(watch, ["averageCompletionRate"], 0)}%`, hint: "Average viewing completion" }];
  return <section className="glass rounded-[2rem] p-4 sm:p-5"><LivePanelHeader connected={connected} message={state?.message ?? "Loading SK MediaFlow analytics."} title="SK MediaFlow growth" subtitle="Live audience activity, watch quality, content engagement, organizations, and invitation conversion." /><CompactMetrics metrics={metrics} /><div className="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">{[["Likes", cards.likes], ["Dislikes", cards.dislikes], ["Shares", cards.shares], ["Invites", invites.total], ["Accepted", invites.accepted], ["Invite conversion", `${String(invites.acceptanceRate ?? 0)}%`]].map(([label, value]) => <div key={String(label)} className="rounded-[1.2rem] bg-white/60 p-3"><strong className="block text-lg">{String(value ?? 0)}</strong><span className="text-[10px] font-black text-slate-500">{String(label)}</span></div>)}</div></section>;
}
