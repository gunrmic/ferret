import { z } from 'zod';

export const ConfigSchema = z.object({
  NPM_REGISTRY_URL: z.string().url().default('https://registry.npmjs.org'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  DATABASE_URL: z.string(),
  MIN_WEEKLY_DOWNLOADS: z.coerce.number().int().positive().default(100_000),
  SCAN_INTERVAL_MINUTES: z.coerce.number().positive().default(5),
});

export type Config = z.infer<typeof ConfigSchema>;

export function loadConfig(): Config {
  return ConfigSchema.parse(process.env);
}
