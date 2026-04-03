export {};

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION:', err);
  process.exit(1);
});

console.log('API starting...');

import Fastify from 'fastify';
import cors from '@fastify/cors';
import { prisma } from '@ferret/db';
import { loadApiConfig } from './config.js';
import { feedRoutes } from './routes/feed.js';
import { scanRoutes } from './routes/scan.js';
import { statsRoutes } from './routes/stats.js';

console.log('Modules loaded, configuring...');

const config = loadApiConfig();

const app = Fastify({ logger: { level: config.LOG_LEVEL } });

await app.register(cors, { origin: config.CORS_ORIGIN });

app.get('/healthz', async () => ({ ok: true, service: 'api' }));

await app.register(feedRoutes);
await app.register(scanRoutes);
await app.register(statsRoutes);

try {
  await app.listen({ port: config.PORT, host: '0.0.0.0' });
  console.log(`API server started on port ${config.PORT}`);
} catch (err) {
  console.error('Failed to start API:', err);
  process.exit(1);
}

async function shutdown() {
  console.log('Shutting down...');
  await app.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
