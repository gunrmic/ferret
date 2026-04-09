import { Worker, type Job } from 'bullmq';
import type { AlertJobPayload } from '@ferret/types';
import { ALERT_QUEUE_NAME, type Redis } from '@ferret/queue';
import { prisma } from '@ferret/db';
import { formatAlertContent } from './format.js';
import type { AlerterConfig } from './config.js';
import { logger } from './logger.js';

function createProcessor(config: AlerterConfig) {
  return async function processAlertJob(job: Job<AlertJobPayload>): Promise<void> {
    const { scanId, packageName, version, riskScore } = job.data;
    const log = logger.child({ scanId, packageName, version, jobId: job.id });

    log.info({ riskScore }, 'Processing alert');

    // Mark scan as alerted
    await prisma.scan.update({
      where: { id: scanId },
      data: { alerted: true },
    });

    // Format alert content
    const content = formatAlertContent(job.data, config.SITE_URL);

    // Create alert record
    await prisma.alert.create({
      data: {
        scanId,
        alertType: 'site',
        content,
      },
    });

    log.info({ scanId }, 'Alert created');
  };
}

export function createAlertWorker(
  connection: Redis,
  config: AlerterConfig,
): Worker<AlertJobPayload> {
  const worker = new Worker<AlertJobPayload>(
    ALERT_QUEUE_NAME,
    createProcessor(config),
    {
      connection,
      concurrency: 1,
    },
  );

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id, packageName: job.data.packageName }, 'Alert job completed');
  });

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, packageName: job?.data.packageName, err: err.message }, 'Alert job failed');
  });

  return worker;
}
