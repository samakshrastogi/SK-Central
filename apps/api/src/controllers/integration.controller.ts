import type { RequestHandler } from 'express';
import { env } from '@/config/env.js';
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
