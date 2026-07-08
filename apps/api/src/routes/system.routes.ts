import { Router } from 'express';
import { getSystem } from '@/controllers/system.controller.js';

export const systemRoutes = Router();
systemRoutes.get('/', getSystem);
