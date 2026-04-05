import { z } from 'zod';

const ApiConfigSchema = z.object({
  DATABASE_URL: z.string(),
  PORT: z.coerce.number().int().positive().default(3003),
  CORS_ORIGIN: z.string().default('http://localhost:3003'),
  LOG_LEVEL: z.string().default('info'),
});

export type ApiConfig = z.infer<typeof ApiConfigSchema>;

export function loadApiConfig(): ApiConfig {
  return ApiConfigSchema.parse(process.env);
}
