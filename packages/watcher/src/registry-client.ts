import { logger } from './logger.js';

interface SearchResult {
  name: string;
  version: string;
}

interface PackumentResult {
  latestVersion: string;
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
    };

    const latestVersion = data['dist-tags'].latest;
    if (!latestVersion) {
      logger.warn({ packageName }, 'No latest dist-tag found');
      return null;
    }

    return {
      latestVersion,
      etag: res.headers.get('etag'),
    };
  }
}
