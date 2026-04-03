import { Worker, type Job } from 'bullmq';
import type { ScanJobPayload } from '@ferret/types';
import { SCAN_QUEUE_NAME, type Redis } from '@ferret/queue';
import { prisma } from '@ferret/db';
import { downloadAndExtract } from './tarball.js';
import { diffDirectories } from './differ.js';
import { analyzeChanges } from './analyzer.js';
import { calculateRiskScore } from './risk-scorer.js';
import { logger } from './logger.js';

async function processScanJob(job: Job<ScanJobPayload>): Promise<void> {
  const { packageName, newVersion, previousVersion, registryUrl } = job.data;
  const log = logger.child({ packageName, newVersion, previousVersion, jobId: job.id });

  log.info('Starting scan');

  let newPkg: { path: string; cleanup: () => Promise<void> } | undefined;
  let oldPkg: { path: string; cleanup: () => Promise<void> } | undefined;

  try {
    // Download tarballs
    newPkg = await downloadAndExtract(registryUrl, packageName, newVersion);

    if (previousVersion) {
      oldPkg = await downloadAndExtract(registryUrl, packageName, previousVersion);
    }

    // Diff
    const diff = await diffDirectories(
      oldPkg?.path ?? null,
      newPkg.path,
    );

    log.info(
      {
        added: diff.addedFiles.length,
        removed: diff.removedFiles.length,
        modified: diff.modifiedFiles.length,
      },
      'Diff complete',
    );

    // Static analysis
    const flags = analyzeChanges(diff);
    const riskScore = calculateRiskScore(flags);

    log.info({ riskScore, flagCount: flags.length }, 'Analysis complete');

    // Store result
    await prisma.scan.create({
      data: {
        packageName,
        version: newVersion,
        previousVersion,
        riskScore,
        staticFlags: JSON.parse(JSON.stringify(flags)),
        alerted: false,
      },
    });

    log.info({ riskScore }, 'Scan stored');
  } finally {
    // Always clean up temp directories
    await newPkg?.cleanup().catch((err) => log.warn({ err }, 'Failed to cleanup new pkg temp dir'));
    await oldPkg?.cleanup().catch((err) => log.warn({ err }, 'Failed to cleanup old pkg temp dir'));
  }
}

export function createScanWorker(
  connection: Redis,
  concurrency: number,
): Worker<ScanJobPayload> {
  const worker = new Worker<ScanJobPayload>(
    SCAN_QUEUE_NAME,
    processScanJob,
    {
      connection,
      concurrency,
      lockDuration: 300_000, // 5 min — tarball downloads can be slow
    },
  );

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id, packageName: job.data.packageName }, 'Job completed');
  });

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, packageName: job?.data.packageName, err: err.message }, 'Job failed');
  });

  return worker;
}
