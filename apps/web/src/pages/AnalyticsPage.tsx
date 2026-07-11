import { useEffect, useMemo, useState } from 'react';
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

const pickString = (source: Record<string, unknown>, keys: string[], fallback: string) => {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value.trim()) return value;
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return fallback;
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
  const [activeProject, setActiveProject] = useState('sk-central');
  const [activeModal, setActiveModal] = useState<'users' | 'logins' | 'visits' | 'time' | null>(null);
  const applications = useApplicationStore((state) => state.applications);
  const projectTabs = useMemo(() => {
    const slugs = ['sk-central', 'sk-quiz', ...applications.map((app) => app.slug)]
      .map((slug) => (slug === 'sk-quiz-coach' ? 'sk-quiz' : slug));
    return [...new Set(slugs)];
  }, [applications]);

  useEffect(() => {
    const load = async () => {
      const response = await api.get('/auth/identity-analytics');
      setData(response.data.data);
    };
    void load();
    const interval = window.setInterval(load, 20_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const load = async () => {
      const response = await api.get('/integrations/sk-quiz/admin-analytics');
      setSkQuiz(response.data.data);
    };
    void load();
    const interval = window.setInterval(load, 20_000);
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
    const grouped = new Map<string, { user: string; email: string; platform: string; seconds: number }>();
    data.activities.filter((item) => item.type === 'active_time').forEach((item) => {
      const user = item.userId?.name ?? 'Unknown';
      const email = item.userId?.email ?? '';
      const key = `${user}-${item.platform}`;
      const row = grouped.get(key) ?? { user, email, platform: item.platform, seconds: 0 };
      row.seconds += item.durationSeconds ?? 0;
      grouped.set(key, row);
    });
    return [...grouped.values()];
  }, [data.activities]);

  const visitRows = useMemo(() => {
    const grouped = new Map<string, { user: string; email: string; date: string; count: number }>();
    data.activities.filter((item) => item.type === 'visit' && item.platform === 'sk-quiz').forEach((item) => {
      const user = item.userId?.name ?? 'Unknown';
      const email = item.userId?.email ?? '';
      const key = `${user}-${item.dateKey}`;
      const row = grouped.get(key) ?? { user, email, date: item.dateKey, count: 0 };
      row.count += 1;
      grouped.set(key, row);
    });
    return [...grouped.values()];
  }, [data.activities]);

  const cards = [
    { label: 'Unique Users', value: data.users.length, icon: UsersRound, modal: 'users' as const },
    { label: 'Login Events', value: loginRows.reduce((sum, row) => sum + row.count, 0), icon: LogIn, modal: 'logins' as const },
    { label: 'SK Quiz Visits', value: visitRows.reduce((sum, row) => sum + row.count, 0), icon: MousePointerClick, modal: 'visits' as const },
    { label: 'Active Time', value: formatDuration(activeTimeRows.reduce((sum, row) => sum + row.seconds, 0)), icon: Clock, modal: 'time' as const }
  ];
  const skQuizSummary = mergeMetricSources(skQuiz.data, [
    'summary',
    'overview',
    'analytics',
    'metrics',
    'counts',
    'quizzes',
    'attempts',
    'exams',
    'studyPlans',
    'ai',
    'mentor'
  ]);
  const skQuizMetrics: SkQuizMetric[] = [
    {
      label: 'Quiz Attempts',
      value: pickString(skQuizSummary, ['attempts', 'quizAttempts', 'totalAttempts', 'completedAttempts', 'totalQuizAttempts'], '0'),
      hint: 'Total submitted quiz attempts from SK Quiz.',
      icon: FileQuestion
    },
    {
      label: 'Completion',
      value: `${pickNumber(skQuizSummary, ['completionRate', 'completion', 'quizCompletion', 'averageCompletionRate'], 0)}%`,
      hint: 'Learners completing quiz flows.',
      icon: Target
    },
    {
      label: 'Accuracy',
      value: `${pickNumber(skQuizSummary, ['accuracy', 'averageAccuracy', 'avgAccuracy', 'averageScore'], 0)}%`,
      hint: 'Average score quality across attempts.',
      icon: Gauge
    },
    {
      label: 'Active Learners',
      value: pickString(skQuizSummary, ['activeLearners', 'students', 'learners', 'users', 'totalUsers'], '0'),
      hint: 'Learners visible to SK Quiz analytics.',
      icon: GraduationCap
    },
    {
      label: 'Study Plans',
      value: pickString(skQuizSummary, ['studyPlans', 'plans', 'activePlans', 'totalStudyPlans'], '0'),
      hint: 'Study plans created or active.',
      icon: BookOpenCheck
    },
    {
      label: 'AI Guidance',
      value: pickString(skQuizSummary, ['aiRequests', 'mentorRequests', 'recommendations', 'coachRequests'], '0'),
      hint: 'Coach or AI recommendation activity.',
      icon: Brain
    }
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
      columns: ['S.no.', 'Users', 'Email ID', 'Date', 'Logins'],
      rows: loginRows.map((row, index) => [index + 1, row.user, row.email, row.date, row.count]),
      footer: `Total logins: ${loginRows.reduce((sum, row) => sum + row.count, 0)}`
    },
    time: {
      title: 'Average Active Time',
      columns: ['S.no.', 'Users', 'Email ID', 'Platform', 'Time spent'],
      rows: activeTimeRows.map((row, index) => [index + 1, row.user, row.email, row.platform, formatDuration(row.seconds)]),
      footer: `Total active time: ${formatDuration(activeTimeRows.reduce((sum, row) => sum + row.seconds, 0))}`
    },
    visits: {
      title: 'SK Quiz Visits',
      columns: ['S.no.', 'Users', 'Email ID', 'Date', 'Visits'],
      rows: visitRows.map((row, index) => [index + 1, row.user, row.email, row.date, row.count]),
      footer: `Total visits: ${visitRows.reduce((sum, row) => sum + row.count, 0)}`
    }
  };

  return (
    <div className="space-y-4">
      <section className="glass rounded-[2rem] p-5">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-700">Smart Analytics</p>
        <h1 className="mt-1 text-3xl font-black text-slate-950">SK Intelligence Dashboard</h1>
        <p className="mt-1 text-sm font-semibold text-slate-500">Central identity, platform usage, SK Quiz visits, and application-level analytics.</p>
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
          <section className="grid gap-3 md:grid-cols-4">
            {cards.map(({ label, value, icon: Icon, modal }) => (
              <button key={label} type="button" onClick={() => setActiveModal(modal)} className="glass rounded-[1.75rem] p-4 text-left transition hover:-translate-y-1 hover:shadow-xl">
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-cyan-100 text-cyan-700"><Icon size={18} /></span>
                <strong className="mt-3 block text-2xl text-slate-950">{value}</strong>
                <span className="text-xs font-black text-slate-500">{label}</span>
              </button>
            ))}
          </section>

          <section className="glass rounded-[2rem] p-5">
            <h2 className="flex items-center gap-2 text-xl font-black text-slate-950"><BarChart3 size={20} /> Central identity intelligence</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
              SK Central owns identity-wide analytics only: unique users, login events, cross-platform active time, SK Quiz visit handoffs, notification activity, sessions, and role changes.
            </p>
          </section>
        </>
      ) : activeProject === 'sk-quiz' ? (
        <section className="glass rounded-[2rem] p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-xl font-black text-slate-950"><BarChart3 size={20} /> SK Quiz learning intelligence</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                Project-specific analytics belong here: exams, quizzes, completion, accuracy, plans, AI guidance, content quality, and learner risk.
              </p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-black ${skQuiz.connected ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'}`}>
              {skQuiz.connected ? 'Live SK Quiz data' : 'Waiting for live SK Quiz data'}
            </span>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            {skQuizMetrics.map(({ label, value, hint, icon: Icon }) => (
              <div key={label} className="rounded-[1.35rem] border border-slate-900/5 bg-white/70 p-3 shadow-sm">
                <span className="grid h-9 w-9 place-items-center rounded-2xl bg-cyan-100 text-cyan-700"><Icon size={17} /></span>
                <strong className="mt-3 block text-xl text-slate-950">{value}</strong>
                <span className="block text-xs font-black text-slate-500">{label}</span>
                <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">{hint}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {[
              ['Exam Coverage', pickString(skQuizSummary, ['exams', 'totalExams', 'selectedExams'], '0'), 'Tracked exam preferences and coverage.'],
              ['Subject Risk', pickString(skQuizSummary, ['weakSubjects', 'riskSubjects', 'subjectRisk'], 'Waiting'), 'Subjects that need admin or content attention.'],
              ['Content Health', pickString(skQuizSummary, ['questionBankHealth', 'contentHealth', 'publishedQuestions'], 'Waiting'), 'Question bank quality and publish readiness.']
            ].map(([label, value, hint]) => (
              <div key={label} className="rounded-[1.35rem] border border-slate-900/5 bg-white/55 p-4">
                <span className="block text-xs font-black uppercase tracking-wide text-slate-500">{label}</span>
                <strong className="mt-2 block text-lg text-slate-950">{value}</strong>
                <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{hint}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-[1.35rem] border border-cyan-200/70 bg-cyan-50/70 p-4 text-sm font-bold leading-6 text-cyan-900">
            {skQuiz.message || 'SK Central is polling the SK Quiz admin analytics endpoint.'}
          </div>
        </section>
      ) : (
        <section className="glass rounded-[2rem] p-5">
          <h2 className="flex items-center gap-2 text-xl font-black text-slate-950"><BarChart3 size={20} /> {activeProject} analytics blueprint</h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
            This app tab is ready for project-specific adapters. Keep shared identity metrics in SK Central and stream only product-owned signals here: health, usage, errors, documents, releases, cost, and feature adoption.
          </p>
        </section>
      )}
      {activeModal ? <AnalyticsModal {...modalMap[activeModal]} onClose={() => setActiveModal(null)} /> : null}
    </div>
  );
}

function AnalyticsModal({ title, columns, rows, footer, onClose }: { title: string; columns: string[]; rows: Array<Array<string | number>>; footer?: string; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const filteredRows = rows.filter((row) => row.join(' ').toLowerCase().includes(query.toLowerCase()));
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/35 p-4 backdrop-blur-sm">
      <div className="glass max-h-[86vh] w-full max-w-5xl overflow-hidden rounded-[2rem]">
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
