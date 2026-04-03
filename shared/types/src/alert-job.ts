import { z } from 'zod';

export const AlertJobPayloadSchema = z.object({
  scanId: z.number().int().positive(),
  packageName: z.string().min(1),
  version: z.string().min(1),
  riskScore: z.number().int().min(0).max(100),
  weeklyDownloads: z.number().int().nonnegative(),
  staticFlags: z.array(
    z.object({
      rule: z.string(),
      severity: z.string(),
      filename: z.string(),
      line: z.number(),
      snippet: z.string(),
      description: z.string(),
    }),
  ),
  detectedAt: z.string().datetime(),
});

export type AlertJobPayload = z.infer<typeof AlertJobPayloadSchema>;
