import type { RequestHandler } from 'express';
import { SearchService } from '@/services/search.service.js';
import { ok } from '@/utils/apiResponse.js';
import { searchQuerySchema } from '@/validators/search.validator.js';

const service = new SearchService();

export const globalSearch: RequestHandler = (req, res) => {
  const { q } = searchQuerySchema.parse(req.query);
  ok(res, service.search(q));
};
