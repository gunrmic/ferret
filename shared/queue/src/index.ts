export { createRedisConnection, type Redis } from './connection.js';
export { SCAN_QUEUE_NAME, DEFAULT_JOB_OPTIONS, ALERT_QUEUE_NAME, ALERT_JOB_OPTIONS } from './constants.js';
export { createScanQueue, addScanJob } from './scan-queue.js';
export { createAlertQueue, addAlertJob } from './alert-queue.js';
export type { Queue } from 'bullmq';
