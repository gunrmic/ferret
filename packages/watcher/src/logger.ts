import pino from 'pino';

export const logger = pino({
  name: 'watcher',
  level: process.env.LOG_LEVEL ?? 'info',
});
