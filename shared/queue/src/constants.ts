import type { JobsOptions } from 'bullmq';

export const SCAN_QUEUE_NAME = 'ferret-scan';

export const DEFAULT_JOB_OPTIONS: JobsOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 30_000,
  },
  removeOnComplete: { age: 86_400, count: 1000 },
  removeOnFail: { age: 604_800 },
};

export const ALERT_QUEUE_NAME = 'ferret-alert';

export const ALERT_JOB_OPTIONS: JobsOptions = {
  attempts: 2,
  backoff: {
    type: 'exponential',
    delay: 15_000,
  },
  removeOnComplete: { age: 86_400, count: 500 },
  removeOnFail: { age: 604_800 },
};
