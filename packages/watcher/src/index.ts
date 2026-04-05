import { createRedisConnection, createScanQueue } from '@ferret/queue';
import { loadWatcherConfig } from './config.js';
import { Poller } from './poller.js';
import { startHealthServer } from './health.js';
import { logger } from './logger.js';

const SHUTDOWN_TIMEOUT_MS = 30_000;

const config = loadWatcherConfig();

const connection = createRedisConnection(config.REDIS_URL);
const queue = createScanQueue(connection);
const poller = new Poller(config, queue);
const healthServer = startHealthServer(config.WATCHER_PORT, connection);

poller.start().catch((err) => {
  logger.fatal({ err }, 'Failed to start poller');
  process.exit(1);
});

logger.info('Watcher started');

async function shutdown() {
  logger.info('Shutting down...');

  const timer = setTimeout(() => {
    logger.error('Graceful shutdown timeout, forcing exit');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);

  poller.stop();
  await queue.close();
  healthServer.close();
  connection.disconnect();

  clearTimeout(timer);
  logger.info('Shutdown complete');
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
