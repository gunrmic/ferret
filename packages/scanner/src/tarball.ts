import { pipeline } from 'node:stream/promises';
import { Readable, Transform } from 'node:stream';
import { dir as tmpDir } from 'tmp-promise';
import { extract } from 'tar';
import { resolve as pathResolve } from 'node:path';
import pLimit from 'p-limit';
import { logger } from './logger.js';

const downloadLimit = pLimit(5);
const MAX_TARBALL_BYTES = 256 * 1024 * 1024; // 256 MB

interface ExtractedPackage {
  path: string;
  cleanup: () => Promise<void>;
}

function assertSafeTarballUrl(tarballUrl: string, registryUrl: string): void {
  const parsed = new URL(tarballUrl);
  const registryHost = new URL(registryUrl).hostname;

  if (parsed.protocol !== 'https:') {
    throw new Error(`Tarball URL must be HTTPS: ${tarballUrl}`);
  }

  if (parsed.hostname !== registryHost && parsed.hostname !== 'registry.npmjs.org') {
    throw new Error(`Tarball URL host ${parsed.hostname} does not match registry ${registryHost}`);
  }
}

function byteLimiter(maxBytes: number): Transform {
  let total = 0;
  return new Transform({
    transform(chunk, _enc, cb) {
      total += chunk.length;
      if (total > maxBytes) {
        cb(new Error(`Tarball exceeds ${maxBytes} byte limit`));
      } else {
        cb(null, chunk);
      }
    },
  });
}

export async function downloadAndExtract(
  registryUrl: string,
  packageName: string,
  version: string,
): Promise<ExtractedPackage> {
  return downloadLimit(async () => {
    const metaUrl = `${registryUrl}/${encodeURIComponent(packageName)}/${version}`;
    logger.info({ packageName, version, url: metaUrl }, 'Fetching package metadata');

    const metaRes = await fetch(metaUrl, {
      signal: AbortSignal.timeout(30_000),
      redirect: 'error',
    });
    if (!metaRes.ok) {
      throw new Error(`Failed to fetch metadata for ${packageName}@${version}: ${metaRes.status}`);
    }

    const meta = (await metaRes.json()) as { dist: { tarball: string } };
    const tarballUrl = meta.dist.tarball;

    assertSafeTarballUrl(tarballUrl, registryUrl);

    logger.info({ packageName, version, tarballUrl }, 'Downloading tarball');

    const { path: tmpPath, cleanup } = await tmpDir({ unsafeCleanup: true });

    const tarRes = await fetch(tarballUrl, {
      signal: AbortSignal.timeout(60_000),
      redirect: 'error',
    });
    if (!tarRes.ok || !tarRes.body) {
      await cleanup();
      throw new Error(`Failed to download tarball: ${tarRes.status}`);
    }

    await pipeline(
      Readable.fromWeb(tarRes.body as import('node:stream/web').ReadableStream),
      byteLimiter(MAX_TARBALL_BYTES),
      extract({
        cwd: tmpPath,
        strip: 1,
        filter: (entryPath, entry) => {
          // Block symlinks — prevents reading outside the sandbox
          const stat = entry as { type?: string };
          if (stat.type === 'SymbolicLink' || stat.type === 'Link') return false;
          // Block path traversal
          const resolved = pathResolve(tmpPath, entryPath);
          if (!resolved.startsWith(tmpPath)) return false;
          return true;
        },
      }),
    );

    logger.info({ packageName, version, path: tmpPath }, 'Extracted tarball');

    return { path: tmpPath, cleanup };
  });
}
