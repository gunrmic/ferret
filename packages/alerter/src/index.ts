import { createRedisConnection, ALERT_QUEUE_NAME } from '@ferret/queue';
import { Queue } from 'bullmq';
import { loadAlerterConfig } from './config.js';
import { createAlertWorker } from './worker.js';
import { createTwitterClient } from './twitter.js';
import { startHealthServer } from './health.js';
import { logger } from './logger.js';

const SHUTDOWN_TIMEOUT_MS = 30_000;
const DLQ_CHECK_INTERVAL_MS = 5 * 60_000;

const config = loadAlerterConfig();

const connection = createRedisConnection(config.REDIS_URL);

let twitterClient = null;
if (config.TWITTER_ENABLED) {
  twitterClient = createTwitterClient(config);
  try {
    await twitterClient.v2.me();
    logger.info('Twitter credentials verified');
  } catch (err) {
    logger.fatal({ err }, 'Twitter credentials invalid — check API keys');
    process.exit(1);
  }
}

const worker = createAlertWorker(connection, config, twitterClient);
const healthServer = startHealthServer(config.ALERTER_PORT, connection);

const alertQueue = new Queue(ALERT_QUEUE_NAME, { connection });

logger.info(
  { twitterEnabled: config.TWITTER_ENABLED },
  'Alerter worker started',
);

// Monitor dead letter queue
const dlqTimer = setInterval(async () => {
  try {
    const failed = await alertQueue.getFailedCount();
    if (failed > 0) {
      logger.warn({ failedJobs: failed, queue: 'alert' }, 'Failed jobs in DLQ');
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
  await alertQueue.close();
  healthServer.close();
  connection.disconnect();

  clearTimeout(timer);
  logger.info('Shutdown complete');
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
