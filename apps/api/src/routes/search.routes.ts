import { Router } from 'express';
import { globalSearch } from '@/controllers/search.controller.js';
import { asyncHandler } from '@/utils/asyncHandler.js';

export const searchRoutes = Router();
searchRoutes.get('/', asyncHandler(globalSearch));
