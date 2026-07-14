import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Activity, ExternalLink, FileUp, Pencil, Plus, Search, ShieldCheck, Trash2, UserRoundCog, X } from 'lucide-react';
import { api } from '@/services/api';
import { useApplicationStore } from '@/store/applicationStore';
import type { ApplicationDocumentation, ManagedApplication, ProjectStatus } from '@/types';

interface ApplicationForm {
  name: string;
  position: number;
  description: string;
  liveLink: string;
  category: string;
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
  metadata?: { previousRole?: string; nextRole?: string; resourceName?: string; resourceType?: string };
}

const defaultForm: ApplicationForm = {
  name: '',
  position: 1,
  description: '',
  liveLink: 'https://example.com',
  category: 'Application',
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
  const [applicationError, setApplicationError] = useState('');
  const [userAccessOpen, setUserAccessOpen] = useState(false);
  const applications = useApplicationStore((state) => state.applications);
  const addApplication = useApplicationStore((state) => state.addApplication);
  const updateApplication = useApplicationStore((state) => state.updateApplication);
  const deleteApplication = useApplicationStore((state) => state.deleteApplication);
  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<ApplicationForm>({ defaultValues: defaultForm });
  const liveLink = watch('liveLink');
  const formError = errors.name?.message ?? errors.description?.message ?? errors.liveLink?.message ?? errors.category?.message;

  const loadUsers = async () => {
    const response = await api.get('/auth/identity-analytics');
    setUsers(response.data.data.users.map((user: AdminUser) => ({ ...user, role: user.role === 'admin' ? 'admin' : 'user' })));
    setAudits(response.data.data.audits);
  };

  useEffect(() => {
    void loadUsers().catch(() => undefined);
    const interval = window.setInterval(() => void loadUsers().catch(() => undefined), 30_000);
    return () => window.clearInterval(interval);
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
    setApplicationError('');
    reset(defaultForm);
  };

  const onSubmit = async (values: ApplicationForm) => {
    setApplicationError('');
    const slug = values.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const existing = applications.find((applicationItem) => applicationItem.id === editingId);
    const application: ManagedApplication = {
      ...(existing ?? {}),
      id: existing?.id ?? `custom_${crypto.randomUUID()}`,
      slug,
      position: Number(values.position),
      name: values.name.trim(),
      category: values.category.trim(),
      description: values.description.trim(),
      longDescription: values.description.trim(),
      status: values.status,
      version: existing?.version ?? '1.0.0',
      technologies: values.technologies.split(',').map((item) => item.trim()).filter(Boolean),
      gradient: 'from-cyan-300/50 via-amber-200/50 to-rose-300/50',
      logo: values.name.slice(0, 2).toUpperCase(),
      metrics: [{ label: 'Users', value: '0' }, { label: 'Requests', value: '0' }, { label: 'Uptime', value: 'New' }],
      features: ['Managed in SK Central', 'Documentation uploaded', 'Live preview configured'],
      roadmap: ['Add production analytics', 'Connect SK Auth', 'Publish release notes'],
      liveLink: values.liveLink.trim(),
      docs: docs.length ? docs : existing?.docs ?? [{ id: `${slug}-readme`, name: `${values.name} README.md`, type: 'md', uploadedAt: new Date().toISOString(), content: `# ${values.name}\n\n${values.description}\n\nLive link: ${values.liveLink}` }],
      analytics: existing?.analytics ?? fallbackMetrics,
      adminAnalytics: existing?.adminAnalytics
    };
    try {
      if (existing) await updateApplication(application);
      else await addApplication(application);
      await loadUsers();
      closeApplicationModal();
    } catch (error) {
      const apiError = error as { response?: { data?: { message?: string } }; message?: string };
      setApplicationError(apiError.response?.data?.message ?? apiError.message ?? 'Unable to save this application.');
    }
  };

  const startAdd = () => {
    setEditingId(null);
    setDocs([]);
    setApplicationError('');
    reset({ ...defaultForm, position: Math.max(0, ...applications.map((application) => application.position)) + 1 });
    setApplicationModalOpen(true);
  };

  const startEdit = (application: ManagedApplication) => {
    setEditingId(application.id);
    setApplicationError('');
    reset({
      name: application.name,
      position: application.position,
      category: application.category,
      liveLink: application.liveLink,
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
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <button type="button" onClick={startAdd} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white sm:w-auto">
              <Plus size={16} /> Add Application
            </button>
            <button type="button" onClick={() => setUserAccessOpen(true)} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-black text-slate-950 shadow-sm sm:w-auto">
              <UserRoundCog size={16} /> Make Admin
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-3">
        <div className="glass rounded-[1.5rem] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-black text-slate-950"><ShieldCheck size={18} /> Managed Applications</h2>
            <label className="flex w-full items-center gap-2 rounded-2xl border border-slate-900/10 bg-white/75 px-3 py-2 sm:min-w-[260px] sm:w-auto">
              <Search size={15} className="text-slate-400" />
              <input value={applicationQuery} onChange={(event) => setApplicationQuery(event.target.value)} placeholder="Search apps" className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm focus:ring-0" />
            </label>
          </div>
          <div className="mt-3 grid gap-3 sm:hidden">
            {filteredApplications.map((application) => (
              <article key={application.id} className="rounded-2xl border border-slate-900/10 bg-white/75 p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-700">Position {application.position}</p>
                    <h3 className="mt-1 break-words font-black text-slate-950">{application.name}</h3>
                    <p className="mt-1 break-words text-xs font-semibold leading-5 text-slate-500">{application.technologies.join(' + ') || 'No technologies listed'}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-cyan-100 px-2 py-1 text-[0.68rem] font-black text-cyan-700">{application.status}</span>
                </div>
                <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-900/5 pt-3">
                  <a href={application.liveLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-black text-cyan-700">Open application <ExternalLink size={12} /></a>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => startEdit(application)} className="rounded-xl bg-cyan-100 p-2.5 text-cyan-700" aria-label={`Edit ${application.name}`}><Pencil size={15} /></button>
                    <button type="button" onClick={() => void deleteApplication(application.id).then(loadUsers)} className="rounded-xl bg-rose-100 p-2.5 text-rose-700" aria-label={`Delete ${application.name}`}><Trash2 size={15} /></button>
                  </div>
                </div>
              </article>
            ))}
            {!filteredApplications.length ? <p className="rounded-2xl bg-white/70 p-4 text-sm font-bold text-slate-500">No applications match this search.</p> : null}
          </div>
          <div className="mt-3 hidden overflow-x-auto rounded-2xl border border-slate-900/10 bg-white/70 sm:block">
            <table className="min-w-[720px] w-full table-fixed text-left text-sm">
              <thead className="bg-white/80 text-[0.68rem] font-black uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="w-24 px-3 py-2">Position</th>
                  <th className="px-3 py-2">Application</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Link</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredApplications.map((application) => (
                  <tr key={application.id} className="border-t border-slate-900/5">
                    <td className="px-3 py-2 font-black text-cyan-700">{application.position}</td>
                    <td className="px-3 py-2">
                      <strong className="block text-slate-950">{application.name}</strong>
                      <span className="block max-w-[13rem] break-words text-xs font-semibold leading-4 text-slate-500 sm:max-w-sm">{application.technologies.join(' + ')}</span>
                    </td>
                    <td className="px-3 py-2"><span className="rounded-full bg-cyan-100 px-2 py-1 text-[0.68rem] font-black text-cyan-700">{application.status}</span></td>
                    <td className="px-3 py-2"><a href={application.liveLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-black text-cyan-700">Open <ExternalLink size={12} /></a></td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => startEdit(application)} className="rounded-xl bg-cyan-100 p-2 text-cyan-700" aria-label={`Edit ${application.name}`}><Pencil size={15} /></button>
                        <button type="button" onClick={() => void deleteApplication(application.id).then(loadUsers)} className="rounded-xl bg-rose-100 p-2 text-rose-700" aria-label={`Delete ${application.name}`}><Trash2 size={15} /></button>
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
          <div className="mt-3 grid max-h-[520px] gap-3 overflow-y-auto pr-1 scrollbar-soft sm:hidden">
            {audits.length ? audits.map((audit) => (
              <article key={audit._id} className="rounded-2xl border border-slate-900/10 bg-white/75 p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="rounded-full bg-cyan-100 px-2 py-1 text-[0.68rem] font-black text-cyan-800">{audit.action.replaceAll('_', ' ')}</span>
                  <time className="text-[0.7rem] font-bold text-slate-500">{new Date(audit.createdAt).toLocaleString()}</time>
                </div>
                <h3 className="mt-3 font-black text-slate-900">{audit.metadata?.resourceName ?? audit.targetUserId?.name ?? 'System'}</h3>
                <p className="mt-1 break-all text-xs font-semibold text-slate-500">{audit.actorUserId?.name ?? 'System'} · {audit.actorUserId?.email ?? 'Automated'}</p>
                <p className="mt-2 text-xs font-semibold text-slate-600">{audit.metadata?.nextRole ? `${audit.metadata.previousRole} → ${audit.metadata.nextRole}` : audit.metadata?.resourceType ?? '—'}</p>
              </article>
            )) : <p className="rounded-2xl bg-white/70 p-4 text-sm font-bold text-slate-500">No admin logs yet.</p>}
          </div>
          <div className="mt-3 hidden max-h-[420px] overflow-auto rounded-2xl border border-slate-900/10 bg-white/70 sm:block">
            <table className="min-w-[680px] w-full table-fixed text-left text-xs">
              <thead className="sticky top-0 bg-white/95 font-black uppercase tracking-wide text-slate-500 backdrop-blur"><tr><th className="px-3 py-3">Date & time</th><th className="px-3 py-3">Admin</th><th className="px-3 py-3">Action</th><th className="px-3 py-3">Changed item</th><th className="px-3 py-3">Details</th></tr></thead>
              <tbody>{audits.length ? audits.map((audit) => (
                <tr key={audit._id} className="border-t border-slate-900/5 align-top">
                  <td className="whitespace-nowrap px-3 py-3 font-bold text-slate-500">{new Date(audit.createdAt).toLocaleString()}</td>
                  <td className="px-3 py-3"><strong className="block text-slate-800">{audit.actorUserId?.name ?? 'System'}</strong><span className="text-slate-500">{audit.actorUserId?.email ?? 'Automated'}</span></td>
                  <td className="px-3 py-3"><span className="rounded-full bg-cyan-100 px-2 py-1 font-black text-cyan-800">{audit.action.replaceAll('_', ' ')}</span></td>
                  <td className="px-3 py-3 font-bold text-slate-700">{audit.metadata?.resourceName ?? audit.targetUserId?.name ?? 'System'}</td>
                  <td className="break-words px-3 py-3 font-semibold text-slate-500">{audit.metadata?.nextRole ? `${audit.metadata.previousRole} → ${audit.metadata.nextRole}` : audit.metadata?.resourceType ?? '—'}</td>
                </tr>
              )) : <tr><td colSpan={5} className="px-3 py-6 font-bold text-slate-500">No admin logs yet.</td></tr>}</tbody>
            </table>
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
                <input {...register('name', { required: 'Application name is required.', minLength: { value: 2, message: 'Application name must contain at least 2 characters.' } })} placeholder="Application name" className="rounded-2xl border-slate-200 text-sm" />
                <select {...register('category', { required: 'Category is required.', minLength: { value: 2, message: 'Category must contain at least 2 characters.' } })} className="rounded-2xl border-slate-200 text-sm">{['Website', 'Application', 'Dashboard', 'Other'].map((category) => <option key={category}>{category}</option>)}</select>
                <input {...register('liveLink', { required: 'Live link is required.', pattern: { value: /^https?:\/\//i, message: 'Live link must begin with http:// or https://.' } })} placeholder="Live link" className="rounded-2xl border-slate-200 text-sm sm:col-span-2" />
                <select {...register('status')} className="rounded-2xl border-slate-200 text-sm">{['Planned', 'In Progress', 'Testing', 'Preview', 'Live', 'Maintenance'].map((status) => <option key={status}>{status}</option>)}</select>
                <label className="grid gap-1 text-xs font-black text-slate-600">Position (1 is first, left to right)<input type="number" min="1" {...register('position', { valueAsNumber: true, required: 'Position is required.', min: { value: 1, message: 'Position must be 1 or greater.' } })} className="rounded-2xl border-slate-200 text-sm font-semibold text-slate-950" /></label>
                <input {...register('technologies')} placeholder="React, Node, MongoDB" className="rounded-2xl border-slate-200 text-sm sm:col-span-2" />
                <textarea {...register('description', { required: 'Description is required.', minLength: { value: 8, message: 'Description must contain at least 8 characters.' } })} placeholder="Description" rows={4} className="rounded-2xl border-slate-200 text-sm sm:col-span-2" />
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
            {applicationError || formError ? <p className="mt-3 rounded-2xl bg-rose-100 px-4 py-3 text-sm font-bold text-rose-800">{applicationError || formError}</p> : null}
            <button disabled={isSubmitting} className="mt-3 rounded-2xl bg-slate-950 px-5 py-2.5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60" type="submit">{isSubmitting ? 'Saving...' : editingId ? 'Save Changes' : 'Add Application'}</button>
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




