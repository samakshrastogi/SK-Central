import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { projects } from '@/constants/projects';
import type { ApplicationDocumentation, ManagedApplication } from '@/types';

const seedDocs = (name: string): ApplicationDocumentation[] => [
  {
    id: `${name.toLowerCase().replaceAll(' ', '-')}-overview`,
    name: `${name} Overview.md`,
    type: 'md',
    uploadedAt: new Date().toISOString(),
    content: `# ${name}\n\n## Overview\n${name} is managed inside SK Central with launch, analytics, documentation, roadmap, and administrative metadata.\n\n## Operating Notes\n- Review health daily.\n- Keep documentation current after each release.\n- Track requests, usage, uptime, and errors from the admin analytics view.\n\n## Support\nUse SK Central AI Assistant for application and documentation questions only.`
  }
];

const skQuizAdminAnalytics: ManagedApplication['adminAnalytics'] = {
  sourcePath: 'C:\\Users\\Samaksh Rastogi\\OneDrive\\Desktop\\sk-quiz',
  endpoint: 'GET /admin/analytics',
  collections: [
    'UserModel',
    'ProfileModel',
    'OnboardingStateModel',
    'AuthActivityModel',
    'AnalyticsModel',
    'TargetExamModel',
    'StudyPlanModel',
    'QuizSessionModel',
    'QuestionAttemptModel'
  ],
  summaryFields: [
    { key: 'userCount', label: 'Users', description: 'Total registered users.' },
    { key: 'activeUsers7d', label: 'Active 7d', description: 'Users active during the last 7 days.' },
    { key: 'activeUsers30d', label: 'Active 30d', description: 'Users active during the last 30 days.' },
    { key: 'trackedExamCount', label: 'Tracked Exams', description: 'Unique non-empty exams selected by learners.' },
    { key: 'totalRegisteredExams', label: 'Registered Exams', description: 'Total selected exam registrations across users.' },
    { key: 'planTasks', label: 'Plan Tasks', description: 'All generated study-plan tasks.' },
    { key: 'completedPlanTasks', label: 'Completed Plan Tasks', description: 'Study-plan tasks marked done.' },
    { key: 'planCompletionRate', label: 'Plan Completion', description: 'Completed tasks divided by all plan tasks.' },
    { key: 'studySeconds', label: 'Study Time', description: 'Active platform usage duration from AnalyticsModel.' },
    { key: 'quizRecords', label: 'Quiz Records', description: 'All quiz history records.' },
    { key: 'quizUserCount', label: 'Quiz Users', description: 'Unique users with quiz history.' },
    { key: 'completedQuizzes', label: 'Completed Quizzes', description: 'Quiz records with completed status.' },
    { key: 'quizCompletionRate', label: 'Quiz Completion', description: 'Completed quizzes divided by all quiz records.' },
    { key: 'averageAccuracy', label: 'Average Accuracy', description: 'Average quiz accuracy across completed records.' },
    { key: 'planAdoptionRate', label: 'Plan Adoption', description: 'Users with a generated plan divided by tracked users.' },
    { key: 'engagementRate', label: 'Engagement', description: 'Authenticated users with saved preparation data.' }
  ],
  modelTables: [
    { key: 'usersByDate', label: 'Users By Date', columns: ['Date', 'Count', 'Name of users'] },
    { key: 'loginCounts', label: 'Login Count', columns: ['Users name', 'Date columns with login counts'] },
    { key: 'registeredExams', label: 'Registered Exams', columns: ['Exam name', 'Users count', 'Users name'] },
    { key: 'activeStudyTime', label: 'Active Study Time', columns: ['Users name', 'Date columns with duration'] },
    { key: 'quizzes', label: 'Quizzes', columns: ['Exam name', 'User columns with quiz counts'] }
  ],
  distributions: ['roleDistribution', 'providerDistribution'],
  rows: ['examRows', 'subjectRows', 'users', 'authEvents'],
  timelineFields: ['logins', 'signups', 'plannedHours', 'completedTasks', 'quizzes', 'accuracy'],
  insights: [
    'Highest-demand exam by tracked users',
    'Active users in the last 7 days',
    'Total active platform time',
    'Quiz completion rate',
    'Lowest quiz accuracy risk exam',
    'Plan adoption and onboarding nudge recommendation'
  ],
  realtimeEvents: [
    'register_started',
    'email_verified',
    'login',
    'google_login',
    'return_login',
    'logout',
    'password_reset',
    'platform_usage',
    'exam_selected',
    'plan_generated',
    'plan_task_completed',
    'quiz_started',
    'quiz_completed',
    'question_attempted'
  ]
};

const managedApplications: ManagedApplication[] = projects.filter((project) => project.slug !== 'community').map((project, index) => {
  const isQuizCoach = project.slug === 'sk-quiz-coach';
  return {
    ...project,
    version: isQuizCoach ? '0.1.0' : project.version,
    liveLink: isQuizCoach ? 'http://localhost:5174' : `https://example.com/${project.slug}`,
    docs: seedDocs(project.name),
    analytics: {
      users: ['0 live', '96K', '42K', '8.7K', '1.8K', '640'][index] ?? '1K',
      requests: ['Admin endpoint ready', '2.1M', '860K', '311K', '92K', '540K'][index] ?? '10K',
      uptime: ['Local', '99.91%', '99.95%', '99.8%', 'Preview', '99.7%'][index] ?? '99.9%',
      errors: ['Needs live API', '0.08%', '0.04%', '0.12%', 'N/A', '0.09%'][index] ?? '0.1%',
      storage: ['MongoDB models', '9.2 TB', '420 MB', '1.1 GB', '140 MB', '860 MB'][index] ?? '100 MB',
      growth: ['Trackable', '+22%', '+9%', '+18%', '+4%', '+15%'][index] ?? '+1%'
    },
    adminAnalytics: isQuizCoach ? skQuizAdminAnalytics : undefined
  };
});

interface ApplicationStore {
  applications: ManagedApplication[];
  profile: {
    name: string;
    role: string;
    email: string;
    location: string;
    bio: string;
    avatar: string;
    avatarUrl?: string;
    theme: 'light' | 'soft' | 'vibrant';
  };
  addApplication: (application: ManagedApplication) => void;
  updateApplication: (application: ManagedApplication) => void;
  deleteApplication: (id: string) => void;
  updateProfile: (profile: Partial<ApplicationStore['profile']>) => void;
  resetApplications: () => void;
}

export const useApplicationStore = create<ApplicationStore>()(
  persist(
    (set) => ({
      applications: managedApplications,
      profile: {
        name: '',
        role: '',
        email: '',
        location: 'India',
        bio: '',
        avatar: '',
        avatarUrl: '',
        theme: 'light'
      },
      addApplication: (application) =>
        set((state) => ({
          applications: [application, ...state.applications]
        })),
      updateApplication: (application) =>
        set((state) => ({
          applications: state.applications.map((item) => (item.id === application.id ? application : item))
        })),
      deleteApplication: (id) =>
        set((state) => ({
          applications: state.applications.filter((application) => application.id !== id)
        })),
      updateProfile: (profile) =>
        set((state) => ({
          profile: { ...state.profile, ...profile }
        })),
      resetApplications: () => set({ applications: managedApplications })
    }),
    {
      name: 'sk-central-applications',
      version: 4,
      migrate: (persistedState) => {
        const state = persistedState as ApplicationStore;
        const seededBySlug = new Map(managedApplications.map((application) => [application.slug, application]));
        const savedProfile = state.profile ?? {
          name: '',
          role: '',
          email: '',
          location: 'India',
          bio: '',
          avatar: '',
          avatarUrl: '',
          theme: 'light' as const
        };
        const hasLocalPlaceholderProfile = savedProfile.email.endsWith('@skcentral.local');
        return {
          ...state,
          profile: hasLocalPlaceholderProfile ? { ...savedProfile, name: '', role: '', email: '', bio: '', avatar: '' } : savedProfile,
          applications:
            state.applications
              ?.filter((application) => application.slug !== 'community')
              .map((application) => ({
                ...(seededBySlug.get(application.slug) ?? application),
                ...application,
                adminAnalytics: seededBySlug.get(application.slug)?.adminAnalytics ?? application.adminAnalytics
              })) ?? managedApplications
        };
      }
    }
  )
);
