import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import { allowedOrigins } from '@/config/cors.js';
import { logger } from '@/utils/logger.js';

export function initializeSocket(server: HttpServer) {
  const io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id}`);
    socket.emit('system:event', {
      title: 'Connected to SK Central realtime layer',
      timestamp: new Date().toISOString()
    });
    socket.on('disconnect', () => logger.info(`Socket disconnected: ${socket.id}`));
  });

  return io;
}
