import { createRedisConnection, createAlertQueue, createScanQueue, SCAN_QUEUE_NAME } from '@ferret/queue';
import { Queue } from 'bullmq';
import { loadScannerConfig } from './config.js';
import { createScanWorker } from './worker.js';
import { startHealthServer } from './health.js';
import { logger } from './logger.js';

const SHUTDOWN_TIMEOUT_MS = 30_000;
const DLQ_CHECK_INTERVAL_MS = 5 * 60_000;

const config = loadScannerConfig();

const connection = createRedisConnection(config.REDIS_URL);
const alertQueue = createAlertQueue(connection);
const scanQueue = new Queue(SCAN_QUEUE_NAME, { connection });
const worker = createScanWorker(connection, config.SCANNER_CONCURRENCY, alertQueue);
const healthServer = startHealthServer(config.SCANNER_PORT, connection);

logger.info(
  { concurrency: config.SCANNER_CONCURRENCY },
  'Scanner worker started',
);

// Monitor dead letter queue
const dlqTimer = setInterval(async () => {
  try {
    const failed = await scanQueue.getFailedCount();
    if (failed > 0) {
      logger.warn({ failedJobs: failed, queue: 'scan' }, 'Failed jobs in DLQ');
    }
  } catch {}
}, DLQ_CHECK_INTERVAL_MS);

async function shutdown() {
  logger.info('Shutting down...');

  const timer = setTimeout(() => {
    logger.error('Graceful shutdown timeout, forcing exit');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);

  clearInterval(dlqTimer);
  await worker.close();
  await scanQueue.close();
  await alertQueue.close();
  healthServer.close();
  connection.disconnect();

  clearTimeout(timer);
  logger.info('Shutdown complete');
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
