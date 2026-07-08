import compression from 'compression';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import morgan from 'morgan';
import { corsOptions } from '@/config/cors.js';
import { demoUserMiddleware } from '@/middlewares/demoUser.middleware.js';
import { errorMiddleware } from '@/middlewares/error.middleware.js';
import { notFoundMiddleware } from '@/middlewares/notFound.middleware.js';
import { apiRoutes } from '@/routes/index.js';
import { logger } from '@/utils/logger.js';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors(corsOptions));
  app.use(compression());
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(
    rateLimit({
      windowMs: 60_000,
      limit: 600,
      standardHeaders: 'draft-7',
      legacyHeaders: false
    })
  );
  app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));
  app.use(demoUserMiddleware);
  app.use('/api', apiRoutes);
  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
}
