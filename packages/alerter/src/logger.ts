import pino from 'pino';

export const logger = pino({
  name: 'alerter',
  level: process.env.LOG_LEVEL ?? 'info',
});
