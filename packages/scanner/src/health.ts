import { createServer, type Server } from 'node:http';
import type { Redis } from '@ferret/queue';
import { prisma } from '@ferret/db';
import { logger } from './logger.js';

export function startHealthServer(port: number, redis: Redis): Server {
  const server = createServer(async (_req, res) => {
    try {
      await Promise.all([
        redis.ping(),
        prisma.$queryRaw`SELECT 1`,
      ]);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, service: 'scanner' }));
    } catch (err) {
      logger.error({ err }, 'Health check failed');
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, service: 'scanner' }));
    }
  });

  server.listen(port, () => {
    logger.info({ port }, 'Health server listening');
  });

  return server;
}
