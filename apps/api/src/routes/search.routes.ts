import { Router } from 'express';
import { globalSearch } from '@/controllers/search.controller.js';

export const searchRoutes = Router();
searchRoutes.get('/', globalSearch);
