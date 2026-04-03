import {
  RULE_WEIGHTS,
  MAX_RISK_SCORE,
  DIMINISHING_FACTOR,
  type StaticFlag,
  type StaticFlagRule,
} from '@ferret/types';

export function calculateRiskScore(flags: StaticFlag[]): number {
  // Group flags by rule
  const byRule = new Map<StaticFlagRule, number>();
  for (const flag of flags) {
    byRule.set(flag.rule, (byRule.get(flag.rule) ?? 0) + 1);
  }

  let score = 0;

  for (const [rule, count] of byRule) {
    const weight = RULE_WEIGHTS[rule];
    // First instance = full weight, each subsequent = 50% of weight
    score += weight + (count - 1) * weight * DIMINISHING_FACTOR;
  }

  return Math.min(Math.round(score), MAX_RISK_SCORE);
}
