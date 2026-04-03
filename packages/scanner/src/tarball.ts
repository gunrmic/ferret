import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { dir as tmpDir } from 'tmp-promise';
import { extract } from 'tar';
import pLimit from 'p-limit';
import { logger } from './logger.js';

const downloadLimit = pLimit(5);

interface ExtractedPackage {
  path: string;
  cleanup: () => Promise<void>;
}

export async function downloadAndExtract(
  registryUrl: string,
  packageName: string,
  version: string,
): Promise<ExtractedPackage> {
  return downloadLimit(async () => {
    const metaUrl = `${registryUrl}/${encodeURIComponent(packageName)}/${version}`;
    logger.info({ packageName, version, url: metaUrl }, 'Fetching package metadata');

    const metaRes = await fetch(metaUrl, { signal: AbortSignal.timeout(30_000) });
    if (!metaRes.ok) {
      throw new Error(`Failed to fetch metadata for ${packageName}@${version}: ${metaRes.status}`);
    }

    const meta = (await metaRes.json()) as { dist: { tarball: string } };
    const tarballUrl = meta.dist.tarball;

    logger.info({ packageName, version, tarballUrl }, 'Downloading tarball');

    const { path: tmpPath, cleanup } = await tmpDir({ unsafeCleanup: true });

    const tarRes = await fetch(tarballUrl, { signal: AbortSignal.timeout(60_000) });
    if (!tarRes.ok || !tarRes.body) {
      await cleanup();
      throw new Error(`Failed to download tarball: ${tarRes.status}`);
    }

    await pipeline(
      Readable.fromWeb(tarRes.body as import('node:stream/web').ReadableStream),
      extract({ cwd: tmpPath, strip: 1 }),
    );

    logger.info({ packageName, version, path: tmpPath }, 'Extracted tarball');

    return { path: tmpPath, cleanup };
  });
}
