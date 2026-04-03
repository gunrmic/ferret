import type { StaticFlag } from '@ferret/types';
import type { AnalysisRule } from './types.js';
import { evalUsageRule } from './eval-usage.js';
import { networkCallsRule } from './network-calls.js';
import { envAccessRule } from './env-access.js';
import { childProcessRule } from './child-process.js';
import { base64StringsRule } from './base64-strings.js';
import { fsWritesRule } from './fs-writes.js';
import { compositeRule } from './composite.js';

const ALL_RULES: AnalysisRule[] = [
  evalUsageRule,
  networkCallsRule,
  envAccessRule,
  childProcessRule,
  base64StringsRule,
  fsWritesRule,
  compositeRule,
];

/**
 * Run all rules on a file and return flags.
 * Only returns NEW flags — those found in newCode but not in oldCode.
 */
export function analyzeFile(
  newCode: string,
  filename: string,
  oldCode?: string,
): StaticFlag[] {
  const newFlags = runAllRules(newCode, filename);

  if (!oldCode) {
    // New file — all flags are new
    return newFlags;
  }

  // Build a set of "fingerprints" from the old file's flags
  const oldFlags = runAllRules(oldCode, filename);
  const oldFingerprints = new Set(
    oldFlags.map((f) => `${f.rule}:${f.snippet}`),
  );

  // Only return flags that are genuinely new
  return newFlags.filter((f) => !oldFingerprints.has(`${f.rule}:${f.snippet}`));
}

function runAllRules(code: string, filename: string): StaticFlag[] {
  const flags: StaticFlag[] = [];
  for (const rule of ALL_RULES) {
    flags.push(...rule.run(code, filename));
  }
  return flags;
}

export type { AnalysisRule } from './types.js';
