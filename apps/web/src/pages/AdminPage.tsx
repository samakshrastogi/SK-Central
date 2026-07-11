import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Activity, ExternalLink, FileUp, Pencil, Plus, Search, ShieldCheck, Trash2, UserRoundCog, X } from 'lucide-react';
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
}

interface AuditLog {
  _id: string;
  action: string;
  createdAt: string;
  actorUserId?: { name: string; email: string };
  targetUserId?: { name: string; email: string };
  metadata?: { previousRole?: string; nextRole?: string };
}

const defaultForm: ApplicationForm = {
  name: '',
  description: '',
  liveLink: 'https://example.com',
  category: 'Application',
  version: '1.0.0',
  status: 'Preview',
  technologies: ''
};

const fallbackMetrics = { users: '0', requests: '0', uptime: 'New', errors: '0%', storage: '0 MB', growth: '0%' };

export default function AdminPage() {
  const [docs, setDocs] = useState<ApplicationDocumentation[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [audits, setAudits] = useState<AuditLog[]>([]);
  const [applicationQuery, setApplicationQuery] = useState('');
  const [userQuery, setUserQuery] = useState('');
  const [applicationModalOpen, setApplicationModalOpen] = useState(false);
  const [userAccessOpen, setUserAccessOpen] = useState(false);
  const applications = useApplicationStore((state) => state.applications);
  const addApplication = useApplicationStore((state) => state.addApplication);
  const updateApplication = useApplicationStore((state) => state.updateApplication);
  const deleteApplication = useApplicationStore((state) => state.deleteApplication);
  const { register, handleSubmit, reset, watch } = useForm<ApplicationForm>({ defaultValues: defaultForm });
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

  const closeApplicationModal = () => {
    setApplicationModalOpen(false);
    setEditingId(null);
    setDocs([]);
    reset(defaultForm);
  };

  const onSubmit = async (values: ApplicationForm) => {
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
    if (existing) await updateApplication(application);
    else await addApplication(application);
    closeApplicationModal();
  };

  const startAdd = () => {
    setEditingId(null);
    setDocs([]);
    reset(defaultForm);
    setApplicationModalOpen(true);
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
    setApplicationModalOpen(true);
  };

  const setRole = async (userId: string, role: AdminUser['role']) => {
    await api.post('/auth/users/role', { userId, role });
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

  return (
    <div className="space-y-3">
      <section className="glass rounded-[1.5rem] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-700">Admin</p>
            <h1 className="mt-1 text-2xl font-black text-slate-950">Smart Control Center</h1>
            <p className="mt-1 text-sm font-semibold text-slate-500">Manage applications, roles, and admin history from one compact surface.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={startAdd} className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white">
              <Plus size={16} /> Add Application
            </button>
            <button type="button" onClick={() => setUserAccessOpen(true)} className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-black text-slate-950 shadow-sm">
              <UserRoundCog size={16} /> Make Admin
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-3 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="glass rounded-[1.5rem] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-black text-slate-950"><ShieldCheck size={18} /> Managed Applications</h2>
            <label className="flex min-w-[260px] items-center gap-2 rounded-2xl border border-slate-900/10 bg-white/75 px-3 py-2">
              <Search size={15} className="text-slate-400" />
              <input value={applicationQuery} onChange={(event) => setApplicationQuery(event.target.value)} placeholder="Search apps" className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm focus:ring-0" />
            </label>
          </div>
          <div className="mt-3 overflow-hidden rounded-2xl border border-slate-900/10 bg-white/70">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/80 text-[0.68rem] font-black uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2">Application</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Version</th>
                  <th className="px-3 py-2">Link</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredApplications.map((application) => (
                  <tr key={application.id} className="border-t border-slate-900/5">
                    <td className="px-3 py-2">
                      <strong className="block text-slate-950">{application.name}</strong>
                      <span className="block max-w-sm truncate text-xs font-semibold text-slate-500">{application.technologies.join(' + ')}</span>
                    </td>
                    <td className="px-3 py-2"><span className="rounded-full bg-cyan-100 px-2 py-1 text-[0.68rem] font-black text-cyan-700">{application.status}</span></td>
                    <td className="px-3 py-2 font-bold text-slate-600">{application.version}</td>
                    <td className="px-3 py-2"><a href={application.liveLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-black text-cyan-700">Open <ExternalLink size={12} /></a></td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => startEdit(application)} className="rounded-xl bg-cyan-100 p-2 text-cyan-700" aria-label={`Edit ${application.name}`}><Pencil size={15} /></button>
                        <button type="button" onClick={() => void deleteApplication(application.id)} className="rounded-xl bg-rose-100 p-2 text-rose-700" aria-label={`Delete ${application.name}`}><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!filteredApplications.length ? <tr><td colSpan={5} className="px-3 py-6 text-sm font-bold text-slate-500">No applications match this search.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className="glass rounded-[1.5rem] p-4">
          <h2 className="flex items-center gap-2 text-lg font-black text-slate-950"><Activity size={18} /> Activity Log</h2>
          <div className="mt-3 max-h-[520px] space-y-2 overflow-y-auto pr-1">
            {audits.length ? audits.map((audit) => (
              <div key={audit._id} className="rounded-2xl bg-white/75 p-3 text-sm font-bold text-slate-700">
                <span className="block text-[0.68rem] font-black uppercase tracking-wide text-slate-400">{new Date(audit.createdAt).toLocaleString()}</span>
                {audit.actorUserId?.name ?? 'System'} performed <span className="font-black text-slate-950">{audit.action}</span> for {audit.targetUserId?.name ?? 'unknown user'} {audit.metadata?.nextRole ? `(${audit.metadata.previousRole} -> ${audit.metadata.nextRole})` : ''}.
              </div>
            )) : <p className="rounded-2xl bg-white/75 p-4 text-sm font-bold text-slate-500">No admin logs yet.</p>}
          </div>
        </div>
      </section>

      {applicationModalOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/35 p-4 backdrop-blur-sm" onMouseDown={closeApplicationModal}>
          <form onSubmit={handleSubmit(onSubmit)} className="glass max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-[2rem] p-4" onMouseDown={(event) => event.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-lg font-black text-slate-950">{editingId ? 'Update Application' : 'Add Application'}</h2>
              <button type="button" onClick={closeApplicationModal} className="rounded-xl bg-white p-2 text-slate-700"><X size={16} /></button>
            </div>
            <div className="grid gap-3 lg:grid-cols-[1fr_0.95fr]">
              <div className="grid gap-2 sm:grid-cols-2">
                <input {...register('name', { required: true })} placeholder="Application name" className="rounded-2xl border-slate-200 text-sm" />
                <input {...register('category', { required: true })} placeholder="Category" className="rounded-2xl border-slate-200 text-sm" />
                <input {...register('liveLink', { required: true })} placeholder="Live link" className="rounded-2xl border-slate-200 text-sm sm:col-span-2" />
                <input {...register('version', { required: true })} placeholder="Version" className="rounded-2xl border-slate-200 text-sm" />
                <select {...register('status')} className="rounded-2xl border-slate-200 text-sm">{['Live', 'Beta', 'Preview', 'Planned'].map((status) => <option key={status}>{status}</option>)}</select>
                <input {...register('technologies')} placeholder="React, Node, MongoDB" className="rounded-2xl border-slate-200 text-sm sm:col-span-2" />
                <textarea {...register('description', { required: true })} placeholder="Description" rows={4} className="rounded-2xl border-slate-200 text-sm sm:col-span-2" />
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white/70 p-3 text-xs font-black text-slate-600 sm:col-span-2">
                  <FileUp size={16} /> Upload .md, .pdf, .docx documentation
                  <input type="file" multiple accept=".md,.pdf,.docx" className="hidden" onChange={onFiles} />
                </label>
                {docs.length ? <div className="flex flex-wrap gap-2 sm:col-span-2">{docs.map((doc) => <span key={doc.id} className="inline-flex items-center gap-2 rounded-full bg-cyan-100 px-3 py-1 text-xs font-black text-cyan-800">{doc.name}<button type="button" onClick={() => setDocs((current) => current.filter((item) => item.id !== doc.id))}><X size={12} /></button></span>)}</div> : null}
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-black text-slate-950">Live Preview</h3>
                  <a href={liveLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-black text-cyan-700">Open <ExternalLink size={13} /></a>
                </div>
                <iframe title="Application first page preview" src={liveLink} className="h-[340px] w-full rounded-3xl border border-slate-900/10 bg-white" />
              </div>
            </div>
            <button className="mt-3 rounded-2xl bg-slate-950 px-5 py-2.5 text-sm font-black text-white" type="submit">{editingId ? 'Save Changes' : 'Add Application'}</button>
          </form>
        </div>
      ) : null}

      {userAccessOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/35 p-4 backdrop-blur-sm" onMouseDown={() => setUserAccessOpen(false)}>
          <div className="glass max-h-[86vh] w-full max-w-4xl overflow-hidden rounded-[2rem]" onMouseDown={(event) => event.stopPropagation()}>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-900/10 p-4">
              <div>
                <h2 className="text-xl font-black text-slate-950">Make Admin</h2>
                <p className="text-xs font-bold text-slate-500">Checked users have admin access across SK platforms.</p>
              </div>
              <div className="flex items-center gap-2">
                <input value={userQuery} onChange={(event) => setUserQuery(event.target.value)} placeholder="Search users" className="h-10 rounded-2xl border-slate-200 text-sm" />
                <button type="button" onClick={() => setUserAccessOpen(false)} className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-black text-white">Close</button>
              </div>
            </div>
            <div className="max-h-[62vh] overflow-auto">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-white/90 text-xs font-black uppercase text-slate-500 backdrop-blur">
                  <tr><th className="px-4 py-3">Admin</th><th className="px-4 py-3">Name</th><th className="px-4 py-3">Email ID</th></tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user._id} className="border-t border-slate-900/5">
                      <td className="px-4 py-3"><input type="checkbox" checked={user.role === 'admin'} onChange={(event) => void setRole(user._id, event.target.checked ? 'admin' : 'user')} className="h-4 w-4 rounded border-slate-300 text-slate-950 focus:ring-slate-950" /></td>
                      <td className="px-4 py-3 font-bold text-slate-800">{user.name}</td>
                      <td className="px-4 py-3 font-bold text-slate-600">{user.email}</td>
                    </tr>
                  ))}
                  {!filteredUsers.length ? <tr><td colSpan={3} className="px-4 py-6 text-sm font-bold text-slate-500">No users found.</td></tr> : null}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
