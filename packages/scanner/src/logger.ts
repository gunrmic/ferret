import pino from 'pino';

export const logger = pino({
  name: 'scanner',
  level: process.env.LOG_LEVEL ?? 'info',
});
