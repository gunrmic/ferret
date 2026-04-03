import { z } from 'zod';

const WatcherConfigSchema = z.object({
  NPM_REGISTRY_URL: z.string().url().default('https://registry.npmjs.org'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  DATABASE_URL: z.string(),
  MIN_WEEKLY_DOWNLOADS: z.coerce.number().int().positive().default(100_000),
  SCAN_INTERVAL_MINUTES: z.coerce.number().positive().default(5),
  WATCHER_PORT: z.coerce.number().int().positive().default(3001),
});

export type WatcherConfig = z.infer<typeof WatcherConfigSchema>;

export function loadWatcherConfig(): WatcherConfig {
  return WatcherConfigSchema.parse(process.env);
}
