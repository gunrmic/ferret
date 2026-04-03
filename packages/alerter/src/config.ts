import { z } from 'zod';

const AlerterConfigSchema = z.object({
  REDIS_URL: z.string().default('redis://localhost:6379'),
  DATABASE_URL: z.string(),
  ALERTER_PORT: z.coerce.number().int().positive().default(3004),
  TWITTER_ENABLED: z
    .string()
    .transform((v) => v === 'true' || v === '1')
    .default('false'),
  TWITTER_API_KEY: z.string().default(''),
  TWITTER_API_SECRET: z.string().default(''),
  TWITTER_ACCESS_TOKEN: z.string().default(''),
  TWITTER_ACCESS_SECRET: z.string().default(''),
  SITE_URL: z.string().default('https://ferret.dev'),
});

export type AlerterConfig = z.infer<typeof AlerterConfigSchema>;

export function loadAlerterConfig(): AlerterConfig {
  return AlerterConfigSchema.parse(process.env);
}
