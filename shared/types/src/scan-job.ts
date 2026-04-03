import { z } from 'zod';

export const ScanJobPayloadSchema = z.object({
  packageName: z.string().min(1),
  newVersion: z.string().min(1),
  previousVersion: z.string().nullable(),
  registryUrl: z.string().url(),
  weeklyDownloads: z.number().int().positive(),
  detectedAt: z.string().datetime(),
});

export type ScanJobPayload = z.infer<typeof ScanJobPayloadSchema>;
