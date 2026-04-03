import { z } from 'zod';

const ScannerConfigSchema = z.object({
  REDIS_URL: z.string().default('redis://localhost:6379'),
  DATABASE_URL: z.string(),
  NPM_REGISTRY_URL: z.string().url().default('https://registry.npmjs.org'),
  SCANNER_CONCURRENCY: z.coerce.number().int().positive().default(3),
  SCANNER_PORT: z.coerce.number().int().positive().default(3002),
});

export type ScannerConfig = z.infer<typeof ScannerConfigSchema>;

export function loadScannerConfig(): ScannerConfig {
  return ScannerConfigSchema.parse(process.env);
}
