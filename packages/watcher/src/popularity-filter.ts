import { RegistryClient } from './registry-client.js';

export async function isPopular(
  client: RegistryClient,
  packageName: string,
  minDownloads: number,
): Promise<{ popular: boolean; downloads: number }> {
  const downloads = await client.getWeeklyDownloads(packageName);
  return { popular: downloads >= minDownloads, downloads };
}
