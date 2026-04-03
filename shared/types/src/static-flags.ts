export const STATIC_FLAG_RULES = [
  'eval-usage',
  'network-calls',
  'env-access',
  'child-process',
  'base64-strings',
  'fs-writes',
] as const;

export type StaticFlagRule = (typeof STATIC_FLAG_RULES)[number];

export type Severity = 'low' | 'medium' | 'high' | 'critical';

export interface StaticFlag {
  rule: StaticFlagRule;
  severity: Severity;
  filename: string;
  line: number;
  snippet: string;
  description: string;
}
