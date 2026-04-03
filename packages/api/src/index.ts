import Fastify from 'fastify';
import cors from '@fastify/cors';
import { prisma } from '@ferret/db';
import { loadApiConfig } from './config.js';
import { feedRoutes } from './routes/feed.js';
import { scanRoutes } from './routes/scan.js';
import { statsRoutes } from './routes/stats.js';
import { logger } from './logger.js';
// force rebuild

const config = loadApiConfig();

const app = Fastify({ logger: { level: config.LOG_LEVEL } });

await app.register(cors, { origin: config.CORS_ORIGIN });

app.get('/healthz', async () => ({ ok: true, service: 'api' }));

await app.register(feedRoutes);
await app.register(scanRoutes);
await app.register(statsRoutes);

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
  logger.info('Shutdown complete');
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
