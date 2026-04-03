import { createRedisConnection } from '@ferret/queue';
import { loadAlerterConfig } from './config.js';
import { createAlertWorker } from './worker.js';
import { createTwitterClient } from './twitter.js';
import { startHealthServer } from './health.js';
import { logger } from './logger.js';

const config = loadAlerterConfig();

const connection = createRedisConnection(config.REDIS_URL);

const twitterClient = config.TWITTER_ENABLED
  ? createTwitterClient(config)
  : null;

const worker = createAlertWorker(connection, config, twitterClient);
const healthServer = startHealthServer(config.ALERTER_PORT);

logger.info(
  { twitterEnabled: config.TWITTER_ENABLED },
  'Alerter worker started',
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
