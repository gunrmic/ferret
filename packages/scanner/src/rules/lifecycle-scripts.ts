import type { StaticFlag } from '@ferret/types';

const DANGEROUS_SCRIPTS = ['preinstall', 'install', 'postinstall'];

// Known safe install script commands (native addon build tools)
const SAFE_SCRIPT_PATTERNS = [
  /^node-gyp\s+rebuild/,
  /^node-gyp-build/,
  /^prebuild-install/,
  /^node-pre-gyp\s/,
  /^cmake-js\s/,
  /^napi\s+build/,
  /^patch-package/,
  /^husky\s/,
  /^ngcc/,
  /^opencollective\s/,
  /^is-ci\s/,
  /^node\s+-e\s/,
];

/**
 * Check if package.json has new lifecycle scripts.
 * New preinstall/postinstall scripts are the #1 attack vector
 * (ua-parser-js, coa, rc, eslint-scope all used this).
 */
export function checkLifecycleScripts(
  newPkgJson: string,
  oldPkgJson: string | null,
): StaticFlag[] {
  const flags: StaticFlag[] = [];

  let newPkg: { scripts?: Record<string, string> };
  try {
    newPkg = JSON.parse(newPkgJson);
  } catch {
    return [];
  }

  let oldPkg: { scripts?: Record<string, string> } = { scripts: {} };
  if (oldPkgJson) {
    try {
      oldPkg = JSON.parse(oldPkgJson);
    } catch {
      // If we can't parse old, treat all scripts as new
    }
  }

  const newScripts = newPkg.scripts ?? {};
  const oldScripts = oldPkg.scripts ?? {};

  for (const script of DANGEROUS_SCRIPTS) {
    const newVal = newScripts[script];
    const oldVal = oldScripts[script];

    if (newVal && newVal !== oldVal && !SAFE_SCRIPT_PATTERNS.some((p) => p.test(newVal))) {
      const severity = oldVal ? 'high' : 'critical';
      flags.push({
        rule: 'child-process',
        severity,
        filename: 'package.json',
        line: 0,
        snippet: `"${script}": "${newVal}"`,
        description: oldVal
          ? `LIFECYCLE SCRIPT CHANGED: "${script}" was modified`
          : `NEW LIFECYCLE SCRIPT: "${script}" added (top attack vector in npm supply chain attacks)`,
      });
    }
  }

  return flags;
}
