import type { RequestHandler } from 'express';
import { AnalyticsService } from '@/services/analytics.service.js';
import { ok } from '@/utils/apiResponse.js';

const service = new AnalyticsService();

export const getAnalyticsOverview: RequestHandler = (_req, res) => {
  ok(res, service.overview());
};
