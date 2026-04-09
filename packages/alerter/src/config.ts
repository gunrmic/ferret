import { z } from 'zod';

const AlerterConfigSchema = z.object({
  REDIS_URL: z.string().default('redis://localhost:6379'),
  DATABASE_URL: z.string(),
  ALERTER_PORT: z.coerce.number().int().positive().default(3004),
  SITE_URL: z.string().default('https://ferretwatch.dev'),
});

export type AlerterConfig = z.infer<typeof AlerterConfigSchema>;

export function loadAlerterConfig(): AlerterConfig {
  return AlerterConfigSchema.parse(process.env);
}
