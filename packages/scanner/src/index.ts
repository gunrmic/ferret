import { createRedisConnection } from '@ferret/queue';
import { loadScannerConfig } from './config.js';
import { createScanWorker } from './worker.js';
import { startHealthServer } from './health.js';
import { logger } from './logger.js';

const config = loadScannerConfig();

const connection = createRedisConnection(config.REDIS_URL);
const worker = createScanWorker(connection, config.SCANNER_CONCURRENCY);
const healthServer = startHealthServer(config.SCANNER_PORT);

logger.info(
  { concurrency: config.SCANNER_CONCURRENCY },
  'Scanner worker started',
);

async function shutdown() {
  logger.info('Shutting down...');

  await worker.close();
  healthServer.close();
  connection.disconnect();

  logger.info('Shutdown complete');
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
