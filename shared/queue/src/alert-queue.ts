import { Queue } from 'bullmq';
import type { Redis } from './connection.js';
import { AlertJobPayloadSchema, type AlertJobPayload } from '@ferret/types';
import { ALERT_QUEUE_NAME, ALERT_JOB_OPTIONS } from './constants.js';

export function createAlertQueue(connection: Redis): Queue<AlertJobPayload> {
  return new Queue<AlertJobPayload>(ALERT_QUEUE_NAME, {
    connection,
    defaultJobOptions: ALERT_JOB_OPTIONS,
  });
}

export async function addAlertJob(
  queue: Queue<AlertJobPayload>,
  payload: AlertJobPayload,
) {
  const validated = AlertJobPayloadSchema.parse(payload);
  return queue.add(
    `alert:${validated.packageName}@${validated.version}`,
    validated,
    {
      jobId: `alert:${validated.packageName}@${validated.version}`,
    },
  );
}
