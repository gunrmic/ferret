import type { StaticFlagRule } from './static-flags.js';

export const RULE_WEIGHTS: Record<StaticFlagRule, number> = {
  'child-process': 30,
  'eval-usage': 25,
  'network-calls': 20,
  'env-access': 15,
  'base64-strings': 15,
  'fs-writes': 10,
};

export const MAX_RISK_SCORE = 100;
export const DIMINISHING_FACTOR = 0.5;
