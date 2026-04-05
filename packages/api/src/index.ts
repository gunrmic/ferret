export {};

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import { prisma } from '@ferret/db';
import { loadApiConfig } from './config.js';
import { feedRoutes } from './routes/feed.js';
import { scanRoutes } from './routes/scan.js';
import { statsRoutes } from './routes/stats.js';
import { rssRoutes } from './routes/rss.js';
import { renderDocsPage } from './views/docs.js';
import { renderNotFoundPage } from './views/not-found.js';
import { logger } from './logger.js';

process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught exception');
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  logger.fatal({ err }, 'Unhandled rejection');
  process.exit(1);
});

const config = loadApiConfig();

const app = Fastify({ logger: { level: config.LOG_LEVEL } });

await app.register(cors, { origin: config.CORS_ORIGIN });

await app.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      fontSrc: ["'self'", 'https://fonts.googleapis.com', 'https://fonts.gstatic.com'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      frameAncestors: ["'none'"],
    },
  },
});

await app.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
});

const __dirname = dirname(fileURLToPath(import.meta.url));
await app.register(fastifyStatic, {
  root: join(__dirname, '..', 'public'),
  prefix: '/',
});

app.get('/healthz', async () => ({ ok: true, service: 'api' }));
app.get('/docs', async (_request, reply) => reply.type('text/html').send(renderDocsPage()));

await app.register(feedRoutes);
await app.register(scanRoutes);
await app.register(statsRoutes);
await app.register(rssRoutes);

app.setNotFoundHandler((request, reply) => {
  const wantsHtml = (request.headers.accept ?? '')
    .split(',')
    .some((part) => part.trim().split(';')[0].trim() === 'text/html');

  if (wantsHtml) {
    return reply.status(404).type('text/html').send(renderNotFoundPage());
  }
  return reply.status(404).send({ error: 'Not found' });
});

try {
  await app.listen({ port: config.PORT, host: '0.0.0.0' });
  logger.info({ port: config.PORT }, 'API server started');
} catch (err) {
  logger.fatal({ err }, 'Failed to start API');
  process.exit(1);
}

async function shutdown() {
  logger.info('Shutting down...');
  await app.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
