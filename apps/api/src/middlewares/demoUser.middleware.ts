import type { RequestHandler } from 'express';
import { demoUser } from '@/constants/demoData.js';

declare global {
  namespace Express {
    interface Request {
      user?: typeof demoUser;
    }
  }
}

export const demoUserMiddleware: RequestHandler = (req, _res, next) => {
  req.user = demoUser;
  next();
};
