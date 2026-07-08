import http from 'node:http';
import { createApp } from '@/app.js';
import { env } from '@/config/env.js';
import { connectMongo } from '@/database/mongo.js';
import { getRedisArchitecture } from '@/database/redis.js';
import { initializeSocket } from '@/socket/index.js';
import { logger } from '@/utils/logger.js';

async function bootstrap() {
  if (env.NODE_ENV === 'production') {
    await connectMongo();
  } else {
    void connectMongo();
  }
  getRedisArchitecture();

  const app = createApp();
  const server = http.createServer(app);
  initializeSocket(server);

  server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
      logger.error(`Port ${env.PORT} is already in use. Stop the existing process or set PORT to another value.`);
      process.exit(1);
    }

    logger.error('HTTP server error', error);
    process.exit(1);
  });

  server.listen(env.PORT, () => {
    logger.info(`SK Central API listening on port ${env.PORT}`);
  });
}

bootstrap().catch((error) => {
  logger.error('Failed to bootstrap SK Central API', error);
  process.exit(1);
});
