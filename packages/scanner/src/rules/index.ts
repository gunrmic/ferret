import type { StaticFlag } from '@ferret/types';
import type { AnalysisRule } from './types.js';
import { evalUsageRule } from './eval-usage.js';
import { compositeRule } from './composite.js';

// Only keep rules that have high signal-to-noise ratio:
// - eval-usage: eval(), Function(), module._compile(), vm.runIn*()
// - composite: multi-signal attack patterns (credential exfil, env exfil, etc.)
//
// Removed standalone rules (too many false positives on their own):
// - network-calls: fetch() is a standard global, used everywhere
// - child-process: build tools legitimately spawn processes
// - fs-writes: many packages write files
// - env-access: most packages read some env vars
// - base64-strings: hashes, encoded assets are common
//
// These signals are still detected by the composite rule when they
// appear in suspicious COMBINATIONS (e.g., credential read + network).
const ALL_RULES: AnalysisRule[] = [
  evalUsageRule,
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
