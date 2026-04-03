import type { ScanJobPayload } from '@ferret/types';
import { addScanJob, type Queue } from '@ferret/queue';
import { prisma } from '@ferret/db';
import pLimit from 'p-limit';
import { RegistryClient } from './registry-client.js';
import { SEED_PACKAGES } from './seed-packages.js';
import { logger } from './logger.js';
import type { WatcherConfig } from './config.js';

const REGISTRY_CONCURRENCY = 10;

export class Poller {
  private client: RegistryClient;
  private limit = pLimit(REGISTRY_CONCURRENCY);
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private config: WatcherConfig,
    private queue: Queue<ScanJobPayload>,
  ) {
    this.client = new RegistryClient(config.NPM_REGISTRY_URL);
  }

  async start(): Promise<void> {
    // Seed packages table on first run
    const count = await prisma.package.count();
    if (count === 0) {
      logger.info('No packages in DB, seeding...');
      await this.seedPackages();
    }

    // Run first poll immediately
    await this.poll();

    // Schedule subsequent polls
    const intervalMs = this.config.SCAN_INTERVAL_MINUTES * 60 * 1000;
    this.timer = setInterval(() => {
      this.poll().catch((err) => logger.error({ err }, 'Poll cycle failed'));
    }, intervalMs);

    logger.info(
      { intervalMinutes: this.config.SCAN_INTERVAL_MINUTES },
      'Polling started',
    );
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async seedPackages(): Promise<void> {
    // Get download counts for all seed packages in bulk
    const downloads = await this.client.getBulkDownloads(SEED_PACKAGES);

    logger.info(
      { seedList: SEED_PACKAGES.length, withDownloads: downloads.size },
      'Fetched download counts',
    );

    let seeded = 0;
    for (const [name, count] of downloads) {
      if (count >= this.config.MIN_WEEKLY_DOWNLOADS) {
        await prisma.package.upsert({
          where: { name },
          create: { name, weeklyDownloads: count },
          update: { weeklyDownloads: count },
        });
        seeded++;
      }
    }

    logger.info({ count: seeded }, 'Seeding complete');
  }

  private async poll(): Promise<void> {
    const packages = await prisma.package.findMany();
    logger.info({ packageCount: packages.length }, 'Starting poll cycle');

    let enqueued = 0;

    await Promise.all(
      packages.map((pkg) =>
        this.limit(async () => {
          try {
            const result = await this.client.getPackument(pkg.name, pkg.etag);

            if (!result) {
              // 304 Not Modified or error — skip
              return;
            }

            const { latestVersion, etag } = result;

            // Update etag and lastCheckedAt
            await prisma.package.update({
              where: { id: pkg.id },
              data: {
                etag,
                lastCheckedAt: new Date(),
              },
            });

            // Check if this is a new version
            if (latestVersion !== pkg.lastVersion) {
              logger.info(
                { packageName: pkg.name, oldVersion: pkg.lastVersion, newVersion: latestVersion },
                'New version detected',
              );

              await addScanJob(this.queue, {
                packageName: pkg.name,
                newVersion: latestVersion,
                previousVersion: pkg.lastVersion,
                registryUrl: this.config.NPM_REGISTRY_URL,
                weeklyDownloads: pkg.weeklyDownloads ?? 0,
                detectedAt: new Date().toISOString(),
              });

              // Update last known version
              await prisma.package.update({
                where: { id: pkg.id },
                data: { lastVersion: latestVersion },
              });

              enqueued++;
            }
          } catch (err) {
            logger.warn({ packageName: pkg.name, err }, 'Failed to check package');
          }
        }),
      ),
    );

    logger.info({ enqueued }, 'Poll cycle complete');
  }
}
