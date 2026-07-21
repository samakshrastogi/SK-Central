import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { BarChart3, BookOpenCheck, Brain, Clock, FileQuestion, Gauge, GraduationCap, LogIn, MousePointerClick, Target, UsersRound, X } from 'lucide-react';
import { api } from '@/services/api';
import { MailpilotApprovalManager } from '@/components/analytics/MailpilotApprovalManager';
import { useApplicationStore } from '@/store/applicationStore';
import { useAuthStore } from '@/store/authStore';
import { isReadOnlyAdmin } from '@/utils/adminAccess';

interface IdentityUserRow {
  _id: string;
  name: string;
  email: string;
  role: string;
  createdAt?: string;
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

const formatAnalyticsDate = (dateKey: string) => new Intl.DateTimeFormat('en-IN', {
  day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'
}).format(new Date(`${dateKey}T00:00:00.000Z`));

type CountPivotInput = { user: string; email: string; date: string; count: number };
type DurationPivotInput = { user: string; email: string; platform: string; date: string; seconds: number };
type AnalyticsCell = string | number | boolean;

const buildCountPivot = (source: CountPivotInput[]) => {
  const dates = [...new Set(source.map((row) => row.date))].sort((a, b) => b.localeCompare(a));
  const grouped = new Map<string, { user: string; email: string; counts: Record<string, number> }>();
  source.forEach((row) => {
    const key = `${row.email}-${row.user}`;
    const current = grouped.get(key) ?? { user: row.user, email: row.email, counts: {} };
    current.counts[row.date] = (current.counts[row.date] ?? 0) + row.count;
    grouped.set(key, current);
  });
  const rows: AnalyticsCell[][] = [...grouped.values()].map((row, index) => {
    const values = dates.map((date) => row.counts[date] ?? 0);
    return [index + 1, `${row.user}\n${row.email}`, ...values, values.reduce((sum, value) => sum + value, 0)];
  });
  const dateTotals = dates.map((_, dateIndex) => rows.reduce((sum, row) => sum + Number(row[dateIndex + 2] ?? 0), 0));
  return { dates, rows, totals: ['', 'Date totals', ...dateTotals, dateTotals.reduce((sum, value) => sum + value, 0)] as AnalyticsCell[] };
};

const buildDurationPivot = (source: DurationPivotInput[]) => {
  const dates = [...new Set(source.map((row) => row.date))].sort((a, b) => b.localeCompare(a));
  const grouped = new Map<string, { user: string; email: string; platform: string; seconds: Record<string, number> }>();
  source.forEach((row) => {
    const key = `${row.email}-${row.user}-${row.platform}`;
    const current = grouped.get(key) ?? { user: row.user, email: row.email, platform: row.platform, seconds: {} };
    current.seconds[row.date] = (current.seconds[row.date] ?? 0) + row.seconds;
    grouped.set(key, current);
  });
  const numericRows = [...grouped.values()].map((row) => ({ row, values: dates.map((date) => row.seconds[date] ?? 0) }));
  const rows: AnalyticsCell[][] = numericRows.map(({ row, values }, index) => [
    index + 1, `${row.user}\n${row.email}`, row.platform, ...values.map(formatDuration), formatDuration(values.reduce((sum, value) => sum + value, 0))
  ]);
  const dateTotals = dates.map((_, dateIndex) => numericRows.reduce((sum, item) => sum + item.values[dateIndex], 0));
  return { dates, rows, totals: ['', 'Date totals', 'All platforms', ...dateTotals.map(formatDuration), formatDuration(dateTotals.reduce((sum, value) => sum + value, 0))] as AnalyticsCell[] };
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
  const currentUser = useAuthStore((state) => state.user);
  const readOnly = isReadOnlyAdmin(currentUser);
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

  const loginPivot = useMemo(() => buildCountPivot(loginRows), [loginRows]);
  const quizVisitPivot = useMemo(() => buildCountPivot(quizVisitRows), [quizVisitRows]);
  const mailpilotVisitPivot = useMemo(() => buildCountPivot(mailpilotVisitRows), [mailpilotVisitRows]);
  const chatVisitPivot = useMemo(() => buildCountPivot(chatVisitRows), [chatVisitRows]);
  const mediaflowVisitPivot = useMemo(() => buildCountPivot(mediaflowVisitRows), [mediaflowVisitRows]);
  const activeTimePivot = useMemo(() => buildDurationPivot(activeTimeRows), [activeTimeRows]);
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
      columns: ['S.no.', 'User name', 'Email ID', 'Joined at'],
      rows: data.users.map((user, index) => [index + 1, user.name, user.email, user.createdAt ? new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(user.createdAt)) : 'Not available'])
    },
    logins: {
      title: 'Login Count',
      columns: ['S.no.', 'User', ...loginPivot.dates.map(formatAnalyticsDate), 'Total'],
      rows: loginPivot.rows,
      totals: loginPivot.totals,
      footer: `${loginRows.reduce((sum, row) => sum + row.count, 0)} login events across the full available history.`
    },
    time: {
      title: 'Average Active Time',
      columns: ['S.no.', 'User', 'Platform', ...activeTimePivot.dates.map(formatAnalyticsDate), 'Total'],
      rows: activeTimePivot.rows,
      totals: activeTimePivot.totals,
      footer: `Average ${formatDuration(averageActiveSeconds)} per active user - ${formatDuration(liveActiveSeconds)} total.`
    },
    quizVisits: {
      title: 'SK Quiz Visits',
      columns: ['S.no.', 'User', ...quizVisitPivot.dates.map(formatAnalyticsDate), 'Total'],
      rows: quizVisitPivot.rows,
      totals: quizVisitPivot.totals,
      footer: 'Visits count once per user every 10 minutes.'
    },
    mailpilotVisits: {
      title: 'SK Mailpilot Visits',
      columns: ['S.no.', 'User', ...mailpilotVisitPivot.dates.map(formatAnalyticsDate), 'Total'],
      rows: mailpilotVisitPivot.rows,
      totals: mailpilotVisitPivot.totals,
      footer: 'Visits count once per user every 10 minutes.'
    },
    chatVisits: {
      title: 'SK Chat Visits',
      columns: ['S.no.', 'User', ...chatVisitPivot.dates.map(formatAnalyticsDate), 'Total'],
      rows: chatVisitPivot.rows,
      totals: chatVisitPivot.totals,
      footer: 'Visits count once per user every 10 minutes.'
    },
    mediaflowVisits: {
      title: 'SK MediaFlow Visits',
      columns: ['S.no.', 'User', ...mediaflowVisitPivot.dates.map(formatAnalyticsDate), 'Total'],
      rows: mediaflowVisitPivot.rows,
      totals: mediaflowVisitPivot.totals,
      footer: 'Visits count once per user every 10 minutes.'
    }
  };
  return (
    <div className="space-y-4">
      <section className="glass rounded-[1.5rem] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-700">Smart Analytics</p>
            <h1 className="mt-0.5 text-2xl font-black text-slate-950">SK Intelligence Dashboard</h1>
            <p className="mt-0.5 text-xs font-semibold text-slate-500">Live identity and product insights across the SK ecosystem.</p>
          </div>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-[11px] font-black text-emerald-700"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" /> Live</span>
            <label className="min-w-0 flex-1 sm:min-w-52">
              <span className="sr-only">Analytics application</span>
              <select value={activeProject} onChange={(event) => setActiveProject(event.target.value)} className="h-10 w-full rounded-2xl border-slate-200 bg-white/90 px-3 text-xs font-black text-slate-800 shadow-sm">
                {projectTabs.map((project) => <option key={project} value={project}>{project}</option>)}
              </select>
            </label>
          </div>
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


        </>
      ) : activeProject === 'sk-quiz' ? (
        <QuizIntelligencePanel state={skQuiz} activities={data.activities} />
      ) : (
        <ConnectedApplicationPanel project={activeProject} state={connectedInsights[activeProject]} readOnly={readOnly} />
      )}
      {activeModal ? <AnalyticsModal {...modalMap[activeModal]} onClose={() => setActiveModal(null)} /> : null}
    </div>
  );
}

function AnalyticsModal({ title, columns, rows, totals, footer, onClose }: { title: string; columns: string[]; rows: AnalyticsCell[][]; totals?: AnalyticsCell[]; footer?: string; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const filteredRows = rows.filter((row) => row.join(' ').toLowerCase().includes(query.toLowerCase()));
  const stickyLast = 'sticky right-0 z-10 border-l border-slate-900/10 bg-white/95 shadow-[-8px_0_16px_rgba(15,23,42,0.05)]';
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/35 p-3 backdrop-blur-sm sm:p-4" onMouseDown={onClose}>
      <div className="glass flex max-h-[88vh] w-full max-w-7xl flex-col overflow-hidden rounded-[2rem]" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-900/10 p-4">
          <div>
            <h2 className="text-xl font-black text-slate-950">{title}</h2>
            {footer ? <p className="text-xs font-bold text-slate-500">{footer}</p> : null}
          </div>
          <div className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:flex-none">
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search table" className="h-10 min-w-0 flex-1 rounded-2xl border-slate-200 text-sm sm:w-64" />
            <button type="button" onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-slate-950 text-white" aria-label={`Close ${title}`}><X size={18} /></button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="min-w-full w-max text-left text-sm">
            <thead className="sticky top-0 z-20 bg-white/95 text-xs font-black uppercase text-slate-500 backdrop-blur">
              <tr>{columns.map((column, index) => <th key={`${column}-${index}`} className={`whitespace-nowrap px-4 py-3 ${index === columns.length - 1 && column === 'Total' ? stickyLast : ''}`}>{column}</th>)}</tr>
            </thead>
            <tbody>
              {filteredRows.length ? filteredRows.map((row, rowIndex) => (
                <tr key={rowIndex} className="border-t border-slate-900/5">
                  {row.map((cell, cellIndex) => <td key={`${rowIndex}-${cellIndex}`} className={`whitespace-pre-line px-4 py-3 font-bold text-slate-700 ${cellIndex === columns.length - 1 && columns.at(-1) === 'Total' ? stickyLast : ''}`}>{typeof cell === 'boolean' ? <input type="checkbox" checked={cell} readOnly className="h-4 w-4 rounded border-slate-300 text-cyan-600" aria-label={cell ? 'Completed' : 'Not completed'} /> : cell}</td>)}
                </tr>
              )) : (
                <tr><td className="px-4 py-6 text-sm font-bold text-slate-500" colSpan={columns.length}>No matching data.</td></tr>
              )}
            </tbody>
            {totals ? <tfoot className="sticky bottom-0 z-20 border-t border-slate-900/10 bg-cyan-50/95 text-xs font-black text-slate-900 backdrop-blur">
              <tr>{totals.map((cell, index) => <td key={`total-${index}`} className={`whitespace-nowrap px-4 py-3 ${index === columns.length - 1 && columns.at(-1) === 'Total' ? `${stickyLast} !bg-cyan-50` : ''}`}>{typeof cell === 'boolean' ? <input type="checkbox" checked={cell} readOnly className="h-4 w-4 rounded border-slate-300 text-cyan-600" aria-label={cell ? 'Completed' : 'Not completed'} /> : cell}</td>)}</tr>
            </tfoot> : null}
          </table>
        </div>
      </div>
    </div>
  );
}
interface CompactMetric { label: string; value: string | number; hint: string }

function LivePanelHeader({ connected, message, title, subtitle, action }: { connected: boolean; message: string; title: string; subtitle: string; action?: ReactNode }) {
  return <div className="flex flex-wrap items-start justify-between gap-3">
    <div><h2 className="flex items-center gap-2 text-xl font-black text-slate-950"><BarChart3 size={20} /> {title}</h2><p className="mt-1 max-w-4xl text-sm font-semibold leading-6 text-slate-500">{subtitle}</p></div>
    <div className="flex items-center gap-2">{action}<span className={`rounded-full px-3 py-1 text-xs font-black ${connected ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"}`}>{connected ? "Live data" : "Connection pending"}</span></div>
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

function QuizIntelligencePanel({ state, activities }: { state: SkQuizIntegrationState; activities: ActivityRow[] }) {
  type DetailKey = 'users' | 'exams' | 'plans' | 'streak' | 'inactive4' | 'inactive7' | 'inactive30' | 'quizAbandonment';
  const [activeDetail, setActiveDetail] = useState<DetailKey | null>(null);
  const root = getRecord(state.data);
  const users = getRows(root.users);
  const states = getRows(root.states);
  const now = Date.now();
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const formatDateValue = (value: unknown) => {
    const parsed = new Date(String(value ?? ''));
    return Number.isNaN(parsed.getTime()) ? 'Not available' : new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }).format(parsed);
  };
  const identityById = new Map(users.map((user) => [String(user.id ?? user._id ?? ''), {
    name: pickString(user, ['name'], 'Unknown user'), email: pickString(user, ['email'], 'No email')
  }]));
  const visitorMap = new Map<string, { name: string; email: string; firstVisitAt: number; lastVisitAt: number; dates: Set<string> }>();
  activities.filter((activity) => activity.type === 'visit' && activity.platform === 'sk-quiz' && activity.userId).forEach((activity) => {
    const identity = activity.userId as IdentityUserRow;
    const key = identity._id || identity.email;
    const timestamp = activity.createdAt ? new Date(activity.createdAt).getTime() : new Date(`${activity.dateKey}T00:00:00`).getTime();
    const existing = visitorMap.get(key) ?? { name: identity.name || 'Unknown user', email: identity.email || 'No email', firstVisitAt: timestamp, lastVisitAt: timestamp, dates: new Set<string>() };
    existing.firstVisitAt = Math.min(existing.firstVisitAt, timestamp);
    existing.lastVisitAt = Math.max(existing.lastVisitAt, timestamp);
    existing.dates.add(activity.dateKey);
    visitorMap.set(key, existing);
  });
  const visitors = [...visitorMap.values()].sort((a, b) => a.firstVisitAt - b.firstVisitAt);
  const visitDates = [...new Set(visitors.flatMap((visitor) => [...visitor.dates]))].sort((a, b) => b.localeCompare(a));
  const averageStreak = visitors.length ? Number((visitors.reduce((sum, visitor) => sum + visitor.dates.size, 0) / visitors.length).toFixed(1)) : 0;
  const inactiveVisitors = (days: number) => visitors.filter((visitor) => now - visitor.lastVisitAt >= days * 86_400_000).sort((a, b) => a.lastVisitAt - b.lastVisitAt);

  const userStates = states.filter((item) => item.userId);
  const examRows = userStates.map((item) => {
    const identity = identityById.get(String(item.userId)) ?? { name: 'Unknown user', email: 'No email' };
    const exams = Array.isArray(item.selectedExamNames) ? item.selectedExamNames.map(String).filter((exam) => exam && exam !== 'No exam') : [];
    return { item, identity, exams: [...new Set(exams)] };
  }).filter((row) => row.exams.length > 0);
  const totalRegisteredExams = examRows.reduce((sum, row) => sum + row.exams.length, 0);
  const planProgressRows = examRows.flatMap(({ item, identity, exams }) => {
    const plan = getRows(item.plan);
    const priorityCount = pickNumber(item, ['priorityCount'], 0);
    const visitedSteps = Array.isArray(item.visitedSteps) ? item.visitedSteps.map(String) : [];
    const hasTrackedSteps = visitedSteps.length > 0;
    const hasTime = pickNumber(item, ['dailyHours'], 0) > 0 && pickNumber(item, ['weeklyHours'], 0) > 0 && Boolean(item.quizTime);
    return exams.map((exam) => {
      const examPlan = plan.filter((task) => String(task.examName ?? '') === exam);
      return {
        identity,
        exam,
        details: hasTrackedSteps ? visitedSteps.includes('details') : exams.length > 0,
        priorities: hasTrackedSteps ? visitedSteps.includes('subjects') : priorityCount > 0 || examPlan.length > 0,
        time: hasTrackedSteps ? visitedSteps.includes('time') : hasTime || examPlan.length > 0,
        plan: hasTrackedSteps ? visitedSteps.includes('plan') : examPlan.length > 0
      };
    });
  });
  const completePlanUsers = new Set(planProgressRows.filter((row) => row.plan).map((row) => row.identity.email)).size;

  const assignmentByDate = new Map<string, Set<string>>();
  const attemptByDate = new Map<string, Set<string>>();
  const quizRows = userStates.map((item) => {
    const userId = String(item.userId);
    const identity = identityById.get(userId) ?? { name: 'Unknown user', email: 'No email' };
    const plan = getRows(item.plan).filter((task) => String(task.date ?? '') && String(task.date) <= todayKey);
    const history = getRows(item.quizHistory);
    plan.forEach((task) => {
      const date = String(task.date);
      const usersForDate = assignmentByDate.get(date) ?? new Set<string>();
      usersForDate.add(userId);
      assignmentByDate.set(date, usersForDate);
    });
    history.forEach((quiz) => {
      const date = String(quiz.date ?? '');
      if (!date) return;
      const usersForDate = attemptByDate.get(date) ?? new Set<string>();
      usersForDate.add(userId);
      attemptByDate.set(date, usersForDate);
    });
    const lastAttempt = history.map((quiz) => String(quiz.date ?? '')).filter(Boolean).sort().at(-1);
    return { identity, lastAttempt, attempted: history.length, assigned: plan.length };
  }).filter((row) => row.assigned > 0 || row.attempted > 0);
  const assignmentDates = [...assignmentByDate.keys()];
  const averageDailyMissed = assignmentDates.length ? Number((assignmentDates.reduce((sum, date) => {
    const assigned = assignmentByDate.get(date) ?? new Set<string>();
    const attempted = attemptByDate.get(date) ?? new Set<string>();
    return sum + [...assigned].filter((userId) => !attempted.has(userId)).length;
  }, 0) / assignmentDates.length).toFixed(1)) : 0;

  const inactivityModal = (days: number) => ({
    title: `Inactive ${days}+ Days`,
    columns: ['S.no.', 'User', 'Last active date'],
    rows: inactiveVisitors(days).map((visitor, index) => [index + 1, `${visitor.name}\n${visitor.email}`, formatDateValue(visitor.lastVisitAt)]) as AnalyticsCell[][],
    footer: `Users whose last recorded SK Quiz visit was at least ${days} days ago.`
  });
  const modalMap: Record<DetailKey, { title: string; columns: string[]; rows: AnalyticsCell[][]; footer?: string }> = {
    users: {
      title: 'SK Quiz Users',
      columns: ['S.no.', 'User name', 'Email ID', 'Join date'],
      rows: visitors.map((visitor, index) => [index + 1, visitor.name, visitor.email, formatDateValue(visitor.firstVisitAt)]),
      footer: 'Each user is counted once from their first recorded SK Quiz visit.'
    },
    exams: {
      title: 'Registered Exams',
      columns: ['S.no.', 'User', 'Total exams registered', 'Exam names'],
      rows: examRows.map((row, index) => [index + 1, `${row.identity.name}\n${row.identity.email}`, row.exams.length, row.exams.join(', ')]),
      footer: 'Only exams selected by users are counted; discovered suggestions are excluded.'
    },
    plans: {
      title: 'Exam Plan Progress',
      columns: ['S.no.', 'User', 'Exam', 'Details', 'Priorities', 'Time', 'Plan'],
      rows: planProgressRows.map((row, index) => [index + 1, `${row.identity.name}\n${row.identity.email}`, row.exam, row.details, row.priorities, row.time, row.plan]),
      footer: 'Checked stages have saved progress for that user and exam.'
    },
    streak: {
      title: 'Daily Visit Streaks',
      columns: ['S.no.', 'User', ...visitDates.map(formatAnalyticsDate), 'Total'],
      rows: visitors.map((visitor, index) => [index + 1, `${visitor.name}\n${visitor.email}`, ...visitDates.map((date) => visitor.dates.has(date)), visitor.dates.size]),
      footer: 'A user contributes at most one visit per calendar day.'
    },
    inactive4: inactivityModal(4),
    inactive7: inactivityModal(7),
    inactive30: inactivityModal(30),
    quizAbandonment: {
      title: 'Quiz Abandonment',
      columns: ['S.no.', 'User', 'Last quiz attempted', 'Total quizzes attempted', 'Total quizzes assigned'],
      rows: quizRows.map((row, index) => [index + 1, `${row.identity.name}\n${row.identity.email}`, row.lastAttempt ? formatDateValue(`${row.lastAttempt}T00:00:00`) : 'No quiz attempted', row.attempted, row.assigned]),
      footer: 'Assigned quizzes include planned quiz dates up to today.'
    }
  };
  const metrics: Array<{ key: DetailKey; label: string; value: string | number; hint: string }> = [
    { key: 'users', label: 'Users', value: visitors.length, hint: 'Unique users who visited SK Quiz' },
    { key: 'exams', label: 'Registered exams', value: totalRegisteredExams, hint: 'Selected exams across all users' },
    { key: 'plans', label: 'Complete plans', value: completePlanUsers, hint: 'Users who generated an exam plan' },
    { key: 'streak', label: 'Average streak', value: `${averageStreak} days`, hint: 'Average unique visit days per user' },
    { key: 'inactive4', label: 'Inactive 4+ days', value: inactiveVisitors(4).length, hint: 'No SK Quiz visit for four days' },
    { key: 'inactive7', label: 'Inactive 7+ days', value: inactiveVisitors(7).length, hint: 'No SK Quiz visit for seven days' },
    { key: 'inactive30', label: 'Inactive 30+ days', value: inactiveVisitors(30).length, hint: 'No SK Quiz visit for thirty days' },
    { key: 'quizAbandonment', label: 'Quiz abandonment', value: averageDailyMissed, hint: 'Average users missing assigned quizzes daily' }
  ];
  return <section className="glass rounded-[2rem] p-4 sm:p-5">
    <LivePanelHeader connected={state.connected} message={state.message} title="SK Quiz learning intelligence" subtitle="Live visits, registered exams, onboarding completion, daily engagement, inactivity, and assigned-quiz follow-through." />
    <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric) => <button key={metric.key} type="button" onClick={() => setActiveDetail(metric.key)} className="rounded-[1.2rem] border border-slate-900/5 bg-white/70 p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-lg"><strong className="block text-2xl text-slate-950">{metric.value}</strong><span className="mt-1 block text-sm font-black text-slate-700">{metric.label}</span><p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{metric.hint}</p></button>)}
    </div>
    {activeDetail ? <AnalyticsModal {...modalMap[activeDetail]} onClose={() => setActiveDetail(null)} /> : null}
  </section>;
}
function MailpilotSyncPolicy({ initialLimit, readOnly }: { initialLimit: number; readOnly: boolean }) {
  const [limit, setLimit] = useState(initialLimit);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => setLimit(initialLimit), [initialLimit]);
  const save = async () => {
    setSaving(true); setMessage('');
    try {
      const response = await api.put('/integrations/sk-mailpilot/sync-settings', { syncEmailLimit: limit });
      setLimit(Number(response.data?.data?.syncEmailLimit ?? limit)); setMessage('Saved');
    } catch (error: any) { setMessage(error?.response?.data?.message ?? 'Unable to save'); } finally { setSaving(false); }
  };
  return <div className="mt-3 flex flex-wrap items-end gap-2 rounded-[1.2rem] border border-cyan-100 bg-cyan-50/60 p-3">
    <label className="min-w-48 flex-1"><span className="mb-1 block text-xs font-black text-slate-700">Emails allowed per sync</span><input type="number" min={1} max={100} step={1} value={limit} onChange={(event) => setLimit(Math.min(100, Math.max(1, Number(event.target.value) || 1)))} disabled={readOnly} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold" /></label>
    {!readOnly ? <button type="button" onClick={() => void save()} disabled={saving} className="h-10 rounded-xl bg-slate-950 px-4 text-sm font-black text-white disabled:opacity-50">{saving ? 'Saving...' : 'Save limit'}</button> : null}
    <p className="w-full text-xs font-semibold text-slate-500">This server-enforced limit applies to inbox and Sent-mail syncs for every MailPilot user.{message ? ` ${message}` : ''}</p>
  </div>;
}
function ConnectedApplicationPanel({ project, state, readOnly }: { project: string; state?: SkQuizIntegrationState; readOnly: boolean }) {
  const root = getRecord(state?.data);
  const connected = Boolean(state?.connected);
  if (project === "sk-mailpilot") {
    const summary = getRecord(root.summary); const health = getRecord(root.health); const settings = getRecord(root.settings);
    const metrics: CompactMetric[] = [{ label: "Users", value: pickNumber(summary, ["users"], 0), hint: "MailPilot accounts" }, { label: "Connected mailboxes", value: pickNumber(summary, ["activeMailboxes"], 0), hint: "Active Gmail connections" }, { label: "Processed emails", value: pickNumber(summary, ["processedEmails"], 0), hint: "Indexed active mail" }, { label: "Pending replies", value: pickNumber(summary, ["pendingReplies"], 0), hint: "Messages needing action" }, { label: "Overdue replies", value: pickNumber(summary, ["overdueReplies"], 0), hint: "Reply SLA at risk" }, { label: "Sync health", value: `${pickNumber(health, ["syncSuccessRate"], 0)}%`, hint: "Successful mailbox syncs" }];
    return <section className="glass rounded-[2rem] p-4 sm:p-5"><LivePanelHeader connected={connected} message={state?.message ?? "Loading SK MailPilot analytics."} title="SK MailPilot operations" subtitle="Live mailbox adoption, processing throughput, reply workload, scheduling, and synchronization health." action={<MailpilotApprovalManager readOnly={readOnly} />} /><MailpilotSyncPolicy initialLimit={pickNumber(settings, ['syncEmailLimit'], 25)} readOnly={readOnly} /><CompactMetrics metrics={metrics} /><div className="mt-3 grid gap-3 lg:grid-cols-2"><section className="rounded-[1.3rem] bg-white/60 p-4"><h3 className="text-sm font-black">Email categories</h3><div className="mt-3"><MiniBars rows={getRows(root.categoryDistribution)} valueKey="value" /></div></section><section className="grid grid-cols-2 gap-2 rounded-[1.3rem] bg-white/60 p-4">{[["Recent 7 days", "recentEmails"], ["High priority", "highPriority"], ["Scheduled", "scheduled"], ["Sent", "sent"], ["Failed", "failed"], ["Pending approvals", "pendingApprovals"]].map(([label, key]) => <div key={key} className="rounded-xl bg-slate-50 p-3"><strong className="block text-lg">{pickNumber(summary, [key], 0)}</strong><span className="text-[10px] font-black text-slate-500">{label}</span></div>)}</section></div></section>;
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
