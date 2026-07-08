import type { RequestHandler } from 'express';
import { env } from '@/config/env.js';
import { ok } from '@/utils/apiResponse.js';

interface SkQuizAnalyticsResponse {
  data?: unknown;
}

export const getSkQuizAdminAnalytics: RequestHandler = async (_req, res) => {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (env.SK_QUIZ_ADMIN_TOKEN) headers.Authorization = `Bearer ${env.SK_QUIZ_ADMIN_TOKEN}`;

  try {
    const response = await fetch(`${env.SK_QUIZ_API_URL}/admin/analytics`, { headers });
    const body = (await response.json().catch(() => null)) as SkQuizAnalyticsResponse | null;
    ok(res, {
      connected: response.ok,
      status: response.status,
      source: env.SK_QUIZ_API_URL,
      data: body?.data ?? null,
      message: response.ok
        ? 'Fetched realtime SK Quiz admin analytics.'
        : 'SK Quiz API responded but did not return analytics data. Check admin token and permissions.'
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
