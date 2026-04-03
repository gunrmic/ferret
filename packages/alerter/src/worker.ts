import { Worker, type Job } from 'bullmq';
import type { AlertJobPayload } from '@ferret/types';
import { ALERT_QUEUE_NAME, type Redis } from '@ferret/queue';
import { prisma } from '@ferret/db';
import type { TwitterApi } from 'twitter-api-v2';
import { formatTweet, postTweet } from './twitter.js';
import type { AlerterConfig } from './config.js';
import { logger } from './logger.js';

function createProcessor(config: AlerterConfig, twitterClient: TwitterApi | null) {
  return async function processAlertJob(job: Job<AlertJobPayload>): Promise<void> {
    const { scanId, packageName, version, riskScore } = job.data;
    const log = logger.child({ scanId, packageName, version, jobId: job.id });

    log.info({ riskScore }, 'Processing alert');

    // Mark scan as alerted
    await prisma.scan.update({
      where: { id: scanId },
      data: { alerted: true },
    });

    // Format tweet
    const tweetText = formatTweet(job.data, config.SITE_URL);

    // Post tweet if enabled
    let tweetId: string | null = null;
    if (config.TWITTER_ENABLED && twitterClient) {
      tweetId = await postTweet(twitterClient, tweetText);
      log.info({ tweetId }, 'Tweet posted');
    } else {
      log.info('Twitter disabled, skipping tweet');
    }

    // Create alert record
    await prisma.alert.create({
      data: {
        scanId,
        alertType: 'twitter',
        content: tweetText,
      },
    });

    log.info({ scanId, tweetId }, 'Alert processed');
  };
}

export function createAlertWorker(
  connection: Redis,
  config: AlerterConfig,
  twitterClient: TwitterApi | null,
): Worker<AlertJobPayload> {
  const worker = new Worker<AlertJobPayload>(
    ALERT_QUEUE_NAME,
    createProcessor(config, twitterClient),
    {
      connection,
      concurrency: 1, // Sequential to avoid Twitter rate limits
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
