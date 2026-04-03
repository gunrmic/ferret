import { logger } from './logger.js';

interface SearchResult {
  name: string;
  version: string;
}

interface PackumentResult {
  latestVersion: string;
  previousVersion: string | null;
  etag: string | null;
}

export class RegistryClient {
  constructor(private registryUrl: string) {}

  /**
   * Search npm for popular packages. Returns up to `size` results starting at `from`.
   */
  async searchPopularPackages(
    from: number,
    size: number,
  ): Promise<SearchResult[]> {
    const url = `${this.registryUrl}/-/v1/search?text=not:unstable&popularity=1.0&size=${size}&from=${from}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });

    if (!res.ok) {
      logger.error({ status: res.status, url }, 'Failed to search packages');
      return [];
    }

    const data = (await res.json()) as {
      objects: Array<{
        package: { name: string; version: string };
      }>;
    };

    return data.objects.map((o) => ({
      name: o.package.name,
      version: o.package.version,
    }));
  }

  /**
   * Get weekly download count for a package.
   */
  async getWeeklyDownloads(packageName: string): Promise<number> {
    const url = `https://api.npmjs.org/downloads/point/last-week/${encodeURIComponent(packageName)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });

    if (!res.ok) {
      logger.warn({ status: res.status, packageName }, 'Failed to get download stats');
      return 0;
    }

    const data = (await res.json()) as { downloads: number };
    return data.downloads;
  }

  /**
   * Get weekly downloads for multiple packages.
   * Uses bulk API for unscoped packages, individual requests for scoped.
   */
  async getBulkDownloads(
    packageNames: string[],
  ): Promise<Map<string, number>> {
    const result = new Map<string, number>();

    // Split scoped vs unscoped — bulk API doesn't support scoped packages
    const unscoped = packageNames.filter((n) => !n.startsWith('@'));
    const scoped = packageNames.filter((n) => n.startsWith('@'));

    // Bulk fetch unscoped in chunks of 100
    const chunkSize = 100;
    for (let i = 0; i < unscoped.length; i += chunkSize) {
      const chunk = unscoped.slice(i, i + chunkSize);
      const names = chunk.join(',');
      const url = `https://api.npmjs.org/downloads/point/last-week/${names}`;

      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
        if (!res.ok) {
          logger.warn({ status: res.status }, 'Failed to get bulk download stats');
          continue;
        }

        const data = (await res.json()) as Record<
          string,
          { downloads: number } | null
        >;

        for (const [name, info] of Object.entries(data)) {
          if (info?.downloads) {
            result.set(name, info.downloads);
          }
        }
      } catch (err) {
        logger.warn({ err }, 'Bulk downloads request failed');
      }
    }

    // Fetch scoped packages individually
    for (const name of scoped) {
      const downloads = await this.getWeeklyDownloads(name);
      if (downloads > 0) {
        result.set(name, downloads);
      }
    }

    return result;
  }

  /**
   * Fetch a package's packument (metadata) with conditional request support.
   * Returns null if the package hasn't changed (304 Not Modified).
   */
  async getPackument(
    packageName: string,
    etag?: string | null,
  ): Promise<PackumentResult | null> {
    const url = `${this.registryUrl}/${encodeURIComponent(packageName)}`;

    const headers: Record<string, string> = {
      Accept: 'application/json',
    };
    if (etag) {
      headers['If-None-Match'] = etag;
    }

    const res = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(30_000),
    });

    if (res.status === 304) {
      return null; // Not modified
    }

    if (!res.ok) {
      logger.warn({ status: res.status, packageName }, 'Failed to fetch packument');
      return null;
    }

    const data = (await res.json()) as {
      'dist-tags': { latest?: string };
      time?: Record<string, string>;
    };

    const latestVersion = data['dist-tags'].latest;
    if (!latestVersion) {
      logger.warn({ packageName }, 'No latest dist-tag found');
      return null;
    }

    // Find the previous version by looking at the time field
    let previousVersion: string | null = null;
    if (data.time) {
      const versions = Object.keys(data.time)
        .filter((k) => k !== 'created' && k !== 'modified')
        .sort((a, b) => {
          const ta = new Date(data.time![a]).getTime();
          const tb = new Date(data.time![b]).getTime();
          return ta - tb;
        });
      const latestIdx = versions.indexOf(latestVersion);
      if (latestIdx > 0) {
        previousVersion = versions[latestIdx - 1];
      }
    }

    return {
      latestVersion,
      previousVersion,
      etag: res.headers.get('etag'),
    };
  }
}
