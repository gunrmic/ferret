import type { ScanJobPayload } from '@ferret/types';
import { addScanJob, type Queue } from '@ferret/queue';
import { prisma } from '@ferret/db';
import pLimit from 'p-limit';
import { RegistryClient } from './registry-client.js';
import { isPopular } from './popularity-filter.js';
import { logger } from './logger.js';
import type { WatcherConfig } from './config.js';

const SEARCH_PAGE_SIZE = 250;
const MAX_PACKAGES = 1000;
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
    const packages: Array<{ name: string; downloads: number }> = [];

    // Paginate through npm search results
    for (let from = 0; from < MAX_PACKAGES; from += SEARCH_PAGE_SIZE) {
      const results = await this.client.searchPopularPackages(from, SEARCH_PAGE_SIZE);
      if (results.length === 0) break;

      // Check downloads in parallel
      const checked = await Promise.all(
        results.map((pkg) =>
          this.limit(async () => {
            const { popular, downloads } = await isPopular(
              this.client,
              pkg.name,
              this.config.MIN_WEEKLY_DOWNLOADS,
            );
            return { name: pkg.name, popular, downloads };
          }),
        ),
      );

      for (const pkg of checked) {
        if (pkg.popular) {
          packages.push({ name: pkg.name, downloads: pkg.downloads });
        }
      }

      logger.info(
        { from, fetched: results.length, qualifiedTotal: packages.length },
        'Seeding progress',
      );
    }

    // Upsert all packages
    for (const pkg of packages) {
      await prisma.package.upsert({
        where: { name: pkg.name },
        create: { name: pkg.name, weeklyDownloads: pkg.downloads },
        update: { weeklyDownloads: pkg.downloads },
      });
    }

    logger.info({ count: packages.length }, 'Seeding complete');
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
