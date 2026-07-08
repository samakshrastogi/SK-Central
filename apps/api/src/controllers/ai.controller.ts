import type { RequestHandler } from 'express';
import { z } from 'zod';
import { AIService } from '@/services/ai.service.js';
import { ok } from '@/utils/apiResponse.js';

const bodySchema = z.object({ prompt: z.string().min(1).max(4000) });
const service = new AIService();

export const chat: RequestHandler = async (req, res) => {
  const { prompt } = bodySchema.parse(req.body);
  ok(res, await service.respond(prompt));
};
