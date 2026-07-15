import type { Request, RequestHandler } from 'express';
import { env } from '@/config/env.js';
import { getSession } from '@/services/auth.service.js';
import { ok } from '@/utils/apiResponse.js';

interface SkQuizAnalyticsResponse {
  data?: unknown;
}

const trimSlash = (value: string) => value.replace(/\/+$/, '');

const buildCandidateUrls = () => {
  const base = trimSlash(env.SK_QUIZ_API_URL);
  const candidates = base.endsWith('/api')
    ? [`${base}/admin/analytics`]
    : [`${base}/admin/analytics`, `${base}/api/admin/analytics`];
  return Array.from(new Set(candidates));
};

const buildFailureMessage = (attempts: LiveAttempt[]) => {
  if (attempts.some((attempt) => attempt.status === 401 || attempt.status === 403)) {
    return 'SK Quiz API is reachable, but admin analytics requires an admin JWT. Add SK_QUIZ_ADMIN_TOKEN in apps/api/.env.';
  }
  if (attempts.some((attempt) => attempt.htmlShell)) {
    return 'SK Quiz is reachable, but the configured URL is serving the frontend shell instead of the admin analytics JSON endpoint.';
  }
  if (attempts.some((attempt) => attempt.status === 404)) {
    return 'SK Quiz API is reachable, but the admin analytics route was not found at the attempted paths.';
  }
  return 'SK Quiz API responded but did not return analytics JSON.';
};

interface LiveAttempt {
  url: string;
  status: number;
  contentType: string;
  htmlShell: boolean;
}

export const getSkQuizAdminAnalytics: RequestHandler = async (_req, res) => {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (!env.SK_QUIZ_SERVICE_TOKEN && !env.SK_QUIZ_ADMIN_TOKEN) {
    ok(res, {
      connected: false,
      status: 0,
      source: env.SK_QUIZ_API_URL,
      attempts: [],
      data: null,
      authRequired: true,
      message: 'SK Quiz realtime analytics is paused until SK_QUIZ_SERVICE_TOKEN or SK_QUIZ_ADMIN_TOKEN is configured. No protected SK Quiz request was sent.'
    });
    return;
  }

  if (env.SK_QUIZ_SERVICE_TOKEN) headers['x-sk-central-token'] = env.SK_QUIZ_SERVICE_TOKEN;
  else headers.Authorization = `Bearer ${env.SK_QUIZ_ADMIN_TOKEN}`;

  try {
    const attempts: LiveAttempt[] = [];

    for (const url of buildCandidateUrls()) {
      const response = await fetch(url, { headers });
      const contentType = response.headers.get('content-type') ?? '';
      const text = await response.text();
      const isHtml = contentType.includes('text/html') || text.trimStart().startsWith('<!doctype html') || text.trimStart().startsWith('<html');
      let body: SkQuizAnalyticsResponse | null = null;
      if (!isHtml) {
        try {
          body = JSON.parse(text || '{}') as SkQuizAnalyticsResponse;
        } catch {
          body = null;
        }
      }

      attempts.push({ url, status: response.status, contentType, htmlShell: isHtml });

      if (response.ok && body) {
        ok(res, {
          connected: true,
          status: response.status,
          source: url,
          attempts,
          data: body?.data ?? body ?? null,
          message: 'Fetched realtime SK Quiz admin analytics.'
        });
        return;
      }

      if (response.status === 401 || response.status === 403) break;
    }

    ok(res, {
      connected: false,
      status: attempts.find((attempt) => attempt.status === 401 || attempt.status === 403)?.status ?? attempts.at(-1)?.status ?? 0,
      source: env.SK_QUIZ_API_URL,
      attempts,
      data: null,
      message: buildFailureMessage(attempts)
    });
  } catch (error) {
    ok(res, {
      connected: false,
      status: 0,
      source: env.SK_QUIZ_API_URL,
      data: null,
      message: error instanceof Error ? error.message : 'Unable to reach SK Quiz API.'
    });
  }
};

type ConnectedApplication = "sk-mailpilot" | "sk-chat" | "sk-mediaflow";

const connectedApplications: Record<ConnectedApplication, { baseUrl: string; path: string; label: string }> = {
  "sk-mailpilot": { baseUrl: env.SK_MAILPILOT_API_URL, path: "/audit/central-insights", label: "SK MailPilot" },
  "sk-chat": { baseUrl: env.SK_CHAT_API_URL, path: "/admin/central-insights", label: "SK Chat" },
  "sk-mediaflow": { baseUrl: env.SK_MEDIAFLOW_API_URL, path: "/admin/metrics", label: "SK MediaFlow" }
};

export const getConnectedApplicationAnalytics: RequestHandler = async (req, res) => {
  const application = req.params.application as ConnectedApplication;
  const config = connectedApplications[application];
  if (!config) {
    ok(res, { connected: false, status: 404, data: null, message: "Unknown connected application." });
    return;
  }
  if (!env.SK_QUIZ_SERVICE_TOKEN) {
    ok(res, { connected: false, status: 0, data: null, source: config.baseUrl, authRequired: true, message: "The shared integration service token is not configured." });
    return;
  }
  const url = `${trimSlash(config.baseUrl)}${config.path}`;
  try {
    const response = await fetch(url, { headers: { Accept: "application/json", "x-sk-central-token": env.SK_QUIZ_SERVICE_TOKEN } });
    const contentType = response.headers.get("content-type") ?? "";
    const text = await response.text();
    const isHtml = contentType.includes("text/html") || text.trimStart().startsWith("<");
    let body: Record<string, unknown> | null = null;
    if (!isHtml) { try { body = JSON.parse(text || "{}") as Record<string, unknown>; } catch { body = null; } }
    if (!response.ok || !body) {
      ok(res, { connected: false, status: response.status, source: url, data: null, message: `${config.label} analytics returned ${response.status}${isHtml ? " and an HTML page" : ""}.` });
      return;
    }
    ok(res, { connected: true, status: response.status, source: url, data: body.data ?? body.stats ?? body, message: `Fetched realtime ${config.label} analytics.` });
  } catch (error) {
    ok(res, { connected: false, status: 0, source: url, data: null, message: error instanceof Error ? error.message : `Unable to reach ${config.label}.` });
  }
};

const mailpilotApprovalHeaders = (user: { id: string; email: string; name: string }) => ({
  Accept: 'application/json',
  'Content-Type': 'application/json',
  'x-sk-central-token': env.SK_QUIZ_SERVICE_TOKEN ?? '',
  'x-sk-central-user-id': user.id,
  'x-sk-central-user-email': user.email,
  'x-sk-central-user-name': user.name
});

const requireCentralAdmin = async (req: Request) => {
  const current = await getSession(req);
  if (!current || current.user.role !== 'admin') return null;
  return current.user;
};

export const getSkMailpilotApprovalRequests: RequestHandler = async (req, res) => {
  const user = await requireCentralAdmin(req);
  if (!user) {
    res.status(403).json({ success: false, message: 'SK Central administrator access is required.' });
    return;
  }
  if (!env.SK_QUIZ_SERVICE_TOKEN) {
    res.status(503).json({ success: false, message: 'The shared integration service token is not configured.' });
    return;
  }
  const url = `${trimSlash(env.SK_MAILPILOT_API_URL)}/mail-access/central`;
  const response = await fetch(url, { headers: mailpilotApprovalHeaders(user) });
  const body = await response.json().catch(() => null) as { data?: unknown; message?: string; error?: string } | null;
  if (!response.ok) {
    res.status(response.status).json({ success: false, message: body?.message ?? body?.error ?? 'Unable to load MailPilot approval requests.' });
    return;
  }
  ok(res, { requests: Array.isArray(body?.data) ? body.data : [] });
};

export const manageSkMailpilotApproval: RequestHandler = async (req, res) => {
  const user = await requireCentralAdmin(req);
  if (!user) {
    res.status(403).json({ success: false, message: 'SK Central administrator access is required.' });
    return;
  }
  if (!env.SK_QUIZ_SERVICE_TOKEN) {
    res.status(503).json({ success: false, message: 'The shared integration service token is not configured.' });
    return;
  }
  const decision = req.params.decision;
  if (decision !== 'approve' && decision !== 'reject') {
    res.status(400).json({ success: false, message: 'Decision must be approve or reject.' });
    return;
  }
  const requestId = encodeURIComponent(String(req.params.requestId ?? ''));
  const url = `${trimSlash(env.SK_MAILPILOT_API_URL)}/mail-access/central/${requestId}/${decision}`;
  const response = await fetch(url, { method: 'POST', headers: mailpilotApprovalHeaders(user), body: JSON.stringify({}) });
  const body = await response.json().catch(() => null) as { data?: unknown; message?: string; error?: string } | null;
  if (!response.ok) {
    res.status(response.status).json({ success: false, message: body?.message ?? body?.error ?? `Unable to ${decision} request.` });
    return;
  }
  ok(res, { request: body?.data ?? null }, `MailPilot request ${decision === 'approve' ? 'approved' : 'rejected'}.`);
};
