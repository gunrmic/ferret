import { Queue } from 'bullmq';
import type { Redis } from './connection.js';
import { ScanJobPayloadSchema, type ScanJobPayload } from '@ferret/types';
import { SCAN_QUEUE_NAME, DEFAULT_JOB_OPTIONS } from './constants.js';

export function createScanQueue(connection: Redis): Queue<ScanJobPayload> {
  return new Queue<ScanJobPayload>(SCAN_QUEUE_NAME, {
    connection,
    defaultJobOptions: DEFAULT_JOB_OPTIONS,
  });
}

export async function addScanJob(
  queue: Queue<ScanJobPayload>,
  payload: ScanJobPayload,
) {
  const validated = ScanJobPayloadSchema.parse(payload);
  return queue.add(
    `scan:${validated.packageName}@${validated.newVersion}`,
    validated,
    {
      jobId: `${validated.packageName}@${validated.newVersion}`,
    },
  );
}
