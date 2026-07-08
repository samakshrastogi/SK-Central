import type { ActivityItem, NotificationItem, Project } from '@/types';

export const projects: Project[] = [
  {
    id: 'project_quiz_coach',
    slug: 'sk-quiz-coach',
    name: 'SK Quiz Coach',
    category: 'Learning',
    description: 'Adaptive quiz preparation with practice journeys, analytics, and AI guidance.',
    longDescription:
      'SK Quiz Coach helps learners practice with targeted quizzes, personalized review loops, completion analytics, and coach-style recommendations for sustained improvement.',
    status: 'Live',
    version: '2.8.0',
    technologies: ['React', 'Node.js', 'MongoDB', 'AI'],
    gradient: 'from-cyan-400/30 via-blue-500/20 to-indigo-500/20',
    logo: 'QC',
    metrics: [
      { label: 'Accuracy', value: '87%' },
      { label: 'Attempts', value: '124K' },
      { label: 'Retention', value: '71%' }
    ],
    features: ['Adaptive practice', 'AI explanations', 'Leaderboards', 'Retention analytics'],
    roadmap: ['SSO classrooms', 'Question import pipeline', 'Proctored challenge rooms']
  },
  {
    id: 'project_sk_flips',
    slug: 'sk-flips',
    name: 'SK Flips',
    category: 'Video',
    description: 'Short-form knowledge videos with uploads, subscriptions, and creator analytics.',
    longDescription:
      'SK Flips centralizes short educational video publishing, watch-time analytics, creator tools, moderation, and storage visibility.',
    status: 'Beta',
    version: '1.4.2',
    technologies: ['React', 'Express', 'Multer', 'Socket.IO'],
    gradient: 'from-rose-400/30 via-orange-400/20 to-amber-300/20',
    logo: 'FL',
    metrics: [
      { label: 'Views', value: '2.1M' },
      { label: 'Watch Time', value: '18K h' },
      { label: 'Uploads', value: '5.4K' }
    ],
    features: ['Creator uploads', 'Watch analytics', 'Moderation queue', 'Bandwidth reporting'],
    roadmap: ['Live rooms', 'Creator monetization', 'AI captions']
  },
  {
    id: 'project_community',
    slug: 'community',
    name: 'Community',
    category: 'Collaboration',
    description: 'Forums, announcements, comments, likes, reports, and moderation workflows.',
    longDescription:
      'Community gives SK users a shared place for discussion, announcements, releases, peer help, and moderated collaboration.',
    status: 'Live',
    version: '3.1.0',
    technologies: ['React Router', 'MongoDB', 'Socket.IO'],
    gradient: 'from-emerald-400/30 via-teal-400/20 to-sky-400/20',
    logo: 'CM',
    metrics: [
      { label: 'Posts', value: '18.7K' },
      { label: 'Comments', value: '92K' },
      { label: 'Reports', value: '37' }
    ],
    features: ['Discussion spaces', 'Moderation tools', 'Announcements', 'Community reputation'],
    roadmap: ['Private groups', 'Expert AMAs', 'Automated report triage']
  },
  {
    id: 'project_knowledge',
    slug: 'knowledge-base',
    name: 'Knowledge Base',
    category: 'Documentation',
    description: 'Searchable documentation, runbooks, product manuals, and API references.',
    longDescription:
      'Knowledge Base organizes product documentation, internal runbooks, changelogs, onboarding guides, and operational playbooks.',
    status: 'Preview',
    version: '0.9.0',
    technologies: ['Markdown', 'Search', 'TanStack Query'],
    gradient: 'from-violet-400/30 via-fuchsia-400/20 to-pink-400/20',
    logo: 'KB',
    metrics: [
      { label: 'Articles', value: '486' },
      { label: 'Searches', value: '31K' },
      { label: 'Coverage', value: '92%' }
    ],
    features: ['Docs hub', 'Runbooks', 'API references', 'Versioned releases'],
    roadmap: ['Docs assistant', 'Approval workflows', 'Content ownership maps']
  },
  {
    id: 'project_career',
    slug: 'career-portal',
    name: 'Career Portal',
    category: 'People',
    description: 'Career discovery, applications, interview workflows, and talent analytics.',
    longDescription:
      'Career Portal helps candidates explore roles and lets administrators track hiring pipelines, interviews, and application quality.',
    status: 'Planned',
    version: '0.2.0',
    technologies: ['React Hook Form', 'Node.js', 'MongoDB'],
    gradient: 'from-lime-300/30 via-green-400/20 to-cyan-400/20',
    logo: 'CP',
    metrics: [
      { label: 'Roles', value: '24' },
      { label: 'Applicants', value: '1.8K' },
      { label: 'Interviews', value: '216' }
    ],
    features: ['Role catalog', 'Application forms', 'Interview stages', 'Talent reporting'],
    roadmap: ['Candidate portal', 'Offer workflows', 'Skills matching']
  },
  {
    id: 'project_pm',
    slug: 'project-management',
    name: 'Project Management',
    category: 'Operations',
    description: 'Tasks, roadmaps, releases, team ownership, project health, and delivery rituals.',
    longDescription:
      'Project Management provides Atlassian-style planning with release views, issue tracking, ownership, delivery analytics, and team rituals.',
    status: 'Preview',
    version: '0.7.4',
    technologies: ['Zustand', 'React Router', 'REST APIs'],
    gradient: 'from-sky-400/30 via-indigo-400/20 to-violet-400/20',
    logo: 'PM',
    metrics: [
      { label: 'Projects', value: '42' },
      { label: 'Issues', value: '3.2K' },
      { label: 'Velocity', value: '+18%' }
    ],
    features: ['Roadmaps', 'Issue boards', 'Release notes', 'Delivery analytics'],
    roadmap: ['Sprint planning', 'Dependency graph', 'GitHub sync']
  }
];

export const futureProjects = ['SK Cloud Deploy', 'SK Docs AI', 'SK Identity', 'SK Billing', 'SK Data Studio'];

export const notifications: NotificationItem[] = [
  {
    id: 'n1',
    title: 'SK Quiz Coach 2.8 released',
    description: 'Adaptive review sets and leaderboard exports are now live.',
    group: 'Launches',
    unread: true,
    createdAt: '5 min ago'
  },
  {
    id: 'n2',
    title: 'Infrastructure watch',
    description: 'API latency remains below the target threshold.',
    group: 'System',
    unread: true,
    createdAt: '18 min ago'
  },
  {
    id: 'n3',
    title: 'Community moderation queue',
    description: 'Seven reports are waiting for administrator review.',
    group: 'Community',
    unread: false,
    createdAt: '1 h ago'
  },
  {
    id: 'n4',
    title: 'AI assistant usage',
    description: 'Token usage is trending 12% below budget this week.',
    group: 'AI',
    unread: false,
    createdAt: '3 h ago'
  }
];

export const activities: ActivityItem[] = [
  {
    id: 'a1',
    title: 'SK Flips creator upload pipeline refreshed',
    description: 'Uploads now include metadata enrichment and a moderation checkpoint.',
    type: 'update',
    time: 'Today, 10:20'
  },
  {
    id: 'a2',
    title: 'Knowledge Base preview launched',
    description: 'Docs, runbooks, and API references are searchable from the global command center.',
    type: 'launch',
    time: 'Today, 09:10'
  },
  {
    id: 'a3',
    title: 'MongoDB backup completed',
    description: 'Nightly snapshot finished with no failed collections.',
    type: 'system',
    time: 'Yesterday, 23:58'
  },
  {
    id: 'a4',
    title: 'Community milestone',
    description: 'The community crossed 90K comments across project spaces.',
    type: 'community',
    time: 'Yesterday, 18:44'
  }
];
