import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Activity, ExternalLink, FileUp, Pencil, Plus, Save, Search, ShieldCheck, Trash2, UserMinus, UserRoundCog, X } from 'lucide-react';
import { api } from '@/services/api';
import { useApplicationStore } from '@/store/applicationStore';
import type { ApplicationDocumentation, ManagedApplication, ProjectStatus } from '@/types';

interface ApplicationForm {
  name: string;
  description: string;
  liveLink: string;
  category: string;
  version: string;
  status: ProjectStatus;
  technologies: string;
}

interface AdminUser {
  _id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  disabledAt?: string;
}

interface AuditLog {
  _id: string;
  action: string;
  createdAt: string;
  actorUserId?: { name: string; email: string };
  targetUserId?: { name: string; email: string };
  metadata?: { previousRole?: string; nextRole?: string };
}

const fallbackMetrics = { users: '0', requests: '0', uptime: 'New', errors: '0%', storage: '0 MB', growth: '0%' };

export default function AdminPage() {
  const [docs, setDocs] = useState<ApplicationDocumentation[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [audits, setAudits] = useState<AuditLog[]>([]);
  const [applicationQuery, setApplicationQuery] = useState('');
  const [userQuery, setUserQuery] = useState('');
  const applications = useApplicationStore((state) => state.applications);
  const addApplication = useApplicationStore((state) => state.addApplication);
  const updateApplication = useApplicationStore((state) => state.updateApplication);
  const deleteApplication = useApplicationStore((state) => state.deleteApplication);
  const { register, handleSubmit, reset, watch } = useForm<ApplicationForm>({
    defaultValues: { status: 'Preview', version: '1.0.0', category: 'Application', liveLink: 'https://example.com' }
  });
  const liveLink = watch('liveLink');

  const loadUsers = async () => {
    const response = await api.get('/auth/identity-analytics');
    setUsers(response.data.data.users.map((user: AdminUser) => ({ ...user, role: user.role === 'admin' ? 'admin' : 'user' })));
    setAudits(response.data.data.audits);
  };

  useEffect(() => {
    void loadUsers();
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
      roadmap: ['Add production analytics', 'Connect SK Auth', 'Publish release notes'],
      liveLink: values.liveLink,
      docs: docs.length ? docs : existing?.docs ?? [{ id: `${slug}-readme`, name: `${values.name} README.md`, type: 'md', uploadedAt: new Date().toISOString(), content: `# ${values.name}\n\n${values.description}\n\nLive link: ${values.liveLink}` }],
      analytics: existing?.analytics ?? fallbackMetrics,
      adminAnalytics: existing?.adminAnalytics
    };
    if (existing) updateApplication(application);
    else addApplication(application);
    reset({ status: 'Preview', version: '1.0.0', category: 'Application', liveLink: 'https://example.com' });
    setDocs([]);
    setEditingId(null);
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

  const setRole = async (userId: string, role: AdminUser['role']) => {
    await api.post('/auth/users/role', { userId, role });
    await loadUsers();
  };

  const revoke = async (userId: string) => {
    await api.post('/auth/users/revoke', { userId });
    await loadUsers();
  };

  const filteredApplications = useMemo(() => {
    const normalized = applicationQuery.toLowerCase();
    return applications.filter((application) =>
      [application.name, application.category, application.status, application.liveLink, ...application.technologies].some((value) =>
        value.toLowerCase().includes(normalized)
      )
    );
  }, [applicationQuery, applications]);

  const filteredUsers = useMemo(() => {
    const normalized = userQuery.toLowerCase();
    return users.filter((user) => [user.name, user.email, user.role].some((value) => value.toLowerCase().includes(normalized)));
  }, [userQuery, users]);

  const adminStats = [
    { label: 'Applications', value: applications.length, hint: `${applications.filter((application) => application.status === 'Live').length} live` },
    { label: 'Documents', value: applications.reduce((sum, application) => sum + application.docs.length, 0), hint: 'linked files' },
    { label: 'Admins', value: users.filter((user) => user.role === 'admin').length, hint: 'global access' },
    { label: 'Role Changes', value: audits.length, hint: 'history logs' }
  ];

  return (
    <div className="space-y-4">
      <section className="glass rounded-[2rem] p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-700">Admin</p>
            <h1 className="mt-1 text-3xl font-black text-slate-950">Smart Control Center</h1>
            <p className="mt-1 text-sm font-semibold text-slate-500">Operate applications, live previews, documentation, access control, revocation, and audit history from one compact surface.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {adminStats.map((stat) => (
              <div key={stat.label} className="rounded-2xl bg-white/75 px-4 py-3 shadow-sm">
                <strong className="block text-xl text-slate-950">{stat.value}</strong>
                <span className="block text-[0.68rem] font-black uppercase tracking-wide text-slate-500">{stat.label}</span>
                <span className="block text-[0.68rem] font-bold text-cyan-700">{stat.hint}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[520px_1fr]">
        <form onSubmit={handleSubmit(onSubmit)} className="glass rounded-[2rem] p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-black text-slate-950">
              {editingId ? <Save size={18} /> : <Plus size={18} />} {editingId ? 'Update Application' : 'Add Application'}
            </h2>
            {editingId ? (
              <button type="button" onClick={() => { setEditingId(null); setDocs([]); reset({ status: 'Preview', version: '1.0.0', category: 'Application', liveLink: 'https://example.com' }); }} className="rounded-xl bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">Cancel</button>
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
          <button className="mt-3 w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white" type="submit">{editingId ? 'Save Changes' : 'Add Application'}</button>
        </form>

        <div className="glass rounded-[2rem] p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-950">Live Link Preview</h2>
            <a href={liveLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-black text-cyan-700">Open <ExternalLink size={13} /></a>
          </div>
          <iframe title="Application first page preview" src={liveLink} className="h-[360px] w-full rounded-3xl border border-slate-900/10 bg-white" />
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="glass rounded-[2rem] p-4">
          <h2 className="flex items-center gap-2 text-lg font-black text-slate-950"><ShieldCheck size={18} /> Managed Applications</h2>
          <label className="mt-3 flex items-center gap-2 rounded-2xl border border-slate-900/10 bg-white/75 px-3 py-2">
            <Search size={15} className="text-slate-400" />
            <input value={applicationQuery} onChange={(event) => setApplicationQuery(event.target.value)} placeholder="Search apps, links, tech" className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm focus:ring-0" />
          </label>
          <div className="mt-3 grid gap-2">
            {filteredApplications.map((application) => (
              <div key={application.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white/75 p-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="block truncate text-sm text-slate-950">{application.name}</strong>
                    <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-[0.65rem] font-black uppercase text-cyan-700">{application.status}</span>
                  </div>
                  <span className="block truncate text-xs text-slate-500">{application.liveLink}</span>
                  <span className="block truncate text-[0.68rem] font-bold text-slate-400">{application.technologies.join(' + ')}</span>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => startEdit(application)} className="rounded-xl bg-cyan-100 p-2 text-cyan-700" aria-label={`Edit ${application.name}`}><Pencil size={15} /></button>
                  <button type="button" onClick={() => deleteApplication(application.id)} className="rounded-xl bg-rose-100 p-2 text-rose-700" aria-label={`Delete ${application.name}`}><Trash2 size={15} /></button>
                </div>
              </div>
            ))}
            {!filteredApplications.length ? <p className="rounded-2xl bg-white/75 p-4 text-sm font-bold text-slate-500">No applications match this search.</p> : null}
          </div>
        </div>

        <div className="glass rounded-[2rem] p-4">
          <h2 className="flex items-center gap-2 text-lg font-black text-slate-950"><UserRoundCog size={18} /> User Access</h2>
          <label className="mt-3 flex items-center gap-2 rounded-2xl border border-slate-900/10 bg-white/75 px-3 py-2">
            <Search size={15} className="text-slate-400" />
            <input value={userQuery} onChange={(event) => setUserQuery(event.target.value)} placeholder="Search users, emails, roles" className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm focus:ring-0" />
          </label>
          <div className="mt-3 grid gap-2">
            {filteredUsers.map((user) => (
              <div key={user._id} className="rounded-2xl bg-white/75 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <strong className="block truncate text-sm text-slate-950">{user.name}</strong>
                    <span className="block truncate text-xs text-slate-500">{user.email}</span>
                  </div>
                  <div className="flex gap-2">
                    <select value={user.role} onChange={(event) => void setRole(user._id, event.target.value as AdminUser['role'])} className="rounded-xl border-slate-200 text-xs font-black">
                      <option value="user">user</option>
                      <option value="admin">admin</option>
                    </select>
                    <button type="button" onClick={() => void revoke(user._id)} className="rounded-xl bg-rose-100 p-2 text-rose-700" aria-label={`Revoke ${user.name}`}><UserMinus size={15} /></button>
                  </div>
                </div>
              </div>
            ))}
            {!filteredUsers.length ? <p className="rounded-2xl bg-white/75 p-4 text-sm font-bold text-slate-500">No users match this search.</p> : null}
          </div>
        </div>
      </section>

      <section className="glass rounded-[2rem] p-4">
        <h2 className="flex items-center gap-2 text-lg font-black text-slate-950"><Activity size={18} /> Admin History Logs</h2>
        <div className="mt-3 grid gap-2">
          {audits.length ? audits.map((audit) => (
            <div key={audit._id} className="rounded-2xl bg-white/75 p-3 text-sm font-bold text-slate-700">
              {audit.actorUserId?.name ?? 'System'} performed <span className="font-black text-slate-950">{audit.action}</span> for {audit.targetUserId?.name ?? 'unknown user'} {audit.metadata?.nextRole ? `(${audit.metadata.previousRole} -> ${audit.metadata.nextRole})` : ''}.
            </div>
          )) : <p className="rounded-2xl bg-white/75 p-4 text-sm font-bold text-slate-500">No admin logs yet.</p>}
        </div>
      </section>
    </div>
  );
}
