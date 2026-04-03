import pino from 'pino';

export const logger = pino({
  name: 'api',
  level: process.env.LOG_LEVEL ?? 'info',
});
