import { createRedisConnection, createAlertQueue } from '@ferret/queue';
import { loadScannerConfig } from './config.js';
import { createScanWorker } from './worker.js';
import { startHealthServer } from './health.js';
import { logger } from './logger.js';

const SHUTDOWN_TIMEOUT_MS = 30_000;

const config = loadScannerConfig();

const connection = createRedisConnection(config.REDIS_URL);
const alertQueue = createAlertQueue(connection);
const worker = createScanWorker(connection, config.SCANNER_CONCURRENCY, alertQueue);
const healthServer = startHealthServer(config.SCANNER_PORT, connection);

logger.info(
  { concurrency: config.SCANNER_CONCURRENCY },
  'Scanner worker started',
);

async function shutdown() {
  logger.info('Shutting down...');

  const timer = setTimeout(() => {
    logger.error('Graceful shutdown timeout, forcing exit');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);

  await worker.close();
  await alertQueue.close();
  healthServer.close();
  connection.disconnect();

  clearTimeout(timer);
  logger.info('Shutdown complete');
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
