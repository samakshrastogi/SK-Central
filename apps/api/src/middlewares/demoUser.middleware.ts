import type { RequestHandler } from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        name: string;
        role: string;
        email: string;
      };
    }
  }
}

export const demoUserMiddleware: RequestHandler = (req, _res, next) => {
  next();
};
