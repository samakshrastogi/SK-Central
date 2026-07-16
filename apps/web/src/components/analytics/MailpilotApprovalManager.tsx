import { Check, ExternalLink, LoaderCircle, ShieldCheck, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '@/services/api';

interface ApprovalRequest {
  id: string;
  requesterName?: string;
  requesterEmail?: string;
  loginEmail?: string;
  requestedAccountEmail?: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedAt?: string;
  approvedByEmail?: string;
  createdAt?: string;
}

const formatDate = (value?: string) => value ? new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value)) : '?';

export function MailpilotApprovalManager() {
  const [open, setOpen] = useState(false);
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [actingId, setActingId] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/integrations/sk-mailpilot/approval-requests');
      setRequests(response.data.data?.requests ?? []);
    } catch (requestError: any) {
      setError(requestError.response?.data?.message ?? 'Unable to load MailPilot approval requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (open) void load(); }, [open]);

  const decide = async (requestId: string, decision: 'approve' | 'reject') => {
    setActingId(requestId);
    setError('');
    try {
      await api.post(`/integrations/sk-mailpilot/approval-requests/${encodeURIComponent(requestId)}/${decision}`);
      await load();
    } catch (requestError: any) {
      setError(requestError.response?.data?.message ?? `Unable to ${decision} request.`);
    } finally {
      setActingId('');
    }
  };

  const pending = requests.filter((request) => request.status === 'pending').length;

  return <>
    <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white shadow-lg">
      <ShieldCheck size={17} /> Approval requests
      {pending ? <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px]">{pending}</span> : null}
    </button>
    {open ? <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/45 p-3 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section className="flex max-h-[88dvh] w-full max-w-6xl flex-col overflow-hidden rounded-[1.75rem] bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-3 border-b border-slate-900/10 p-4 sm:p-5">
          <div><p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-700">SK MailPilot</p><h2 className="text-xl font-black text-slate-950">Mailbox approval requests</h2><p className="mt-1 text-sm font-semibold text-slate-500">Any SK Central administrator can approve or reject pending access.</p></div>
          <div className="flex shrink-0 items-center gap-2"><a href="https://console.cloud.google.com/auth/audience?project=sk-mailpilot-498013" target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-black text-white">Visit <ExternalLink size={15} /></a><button type="button" onClick={() => setOpen(false)} className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100" aria-label="Close approval requests"><X size={18} /></button></div>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-5">
          {error ? <p className="mb-3 rounded-xl bg-rose-50 p-3 text-sm font-bold text-rose-700">{error}</p> : null}
          {loading ? <div className="grid place-items-center py-12 text-slate-500"><LoaderCircle className="animate-spin" /></div> : requests.length ? <div className="overflow-x-auto rounded-2xl border border-slate-900/10">
            <table className="w-full min-w-[900px] border-collapse text-left">
              <thead className="bg-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-500"><tr><th className="px-4 py-3">Requester</th><th className="px-4 py-3">Requested mailbox</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Requested</th><th className="px-4 py-3">Reviewed by</th><th className="px-4 py-3 text-right">Action</th></tr></thead>
              <tbody className="divide-y divide-slate-900/10 bg-white">{requests.map((request) => <tr key={request.id} className="align-middle">
                <td className="px-4 py-3"><strong className="block text-sm text-slate-950">{request.requesterName || request.requesterEmail || 'Requester'}</strong><span className="block break-all text-xs text-slate-500">{request.requesterEmail || request.loginEmail}</span></td>
                <td className="break-all px-4 py-3 text-sm font-bold text-slate-700">{request.requestedAccountEmail || request.loginEmail}</td>
                <td className="px-4 py-3"><span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-black uppercase ${request.status === 'pending' ? 'bg-amber-100 text-amber-800' : request.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{request.status}</span></td>
                <td className="whitespace-nowrap px-4 py-3 text-xs font-semibold text-slate-500">{formatDate(request.createdAt)}</td>
                <td className="break-all px-4 py-3 text-xs font-semibold text-slate-500">{request.approvedByEmail || (request.status === 'pending' ? 'Pending' : 'Completed')}</td>
                <td className="px-4 py-3">{request.status === 'pending' ? <div className="flex justify-end gap-2"><button disabled={actingId === request.id} onClick={() => void decide(request.id, 'approve')} className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white disabled:opacity-50"><Check size={14} /> Approve</button><button disabled={actingId === request.id} onClick={() => void decide(request.id, 'reject')} className="rounded-xl bg-rose-100 px-3 py-2 text-xs font-black text-rose-700 disabled:opacity-50">Reject</button></div> : <span className="block text-right text-xs font-semibold text-slate-400">Completed</span>}</td>
              </tr>)}</tbody>
            </table>
          </div> : <p className="py-12 text-center text-sm font-bold text-slate-500">No approval requests found.</p>}
        </div>
      </section>
    </div> : null}
  </>;
}