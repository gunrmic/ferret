import type { StaticFlag } from '@ferret/types';

// Scripts that run on npm install — high risk for supply chain attacks
const INSTALL_SCRIPTS = ['preinstall', 'install', 'postinstall'];

// Scripts that run on publish/pack — only run by maintainers, not consumers
// Flag these at lower severity since they don't affect end users directly
const PUBLISH_SCRIPTS = ['prepare', 'prepack', 'postpack', 'prepublishOnly'];

// Known safe script commands (build tools, native addon builders)
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
  // Build tools
  /^tsc\b/,
  /^tshy\b/,
  /^tsup\b/,
  /^rollup\b/,
  /^esbuild\b/,
  /^webpack\b/,
  /^vite\b/,
  /^babel\b/,
  /^swc\b/,
  /^npm\s+run\s/,
  /^yarn\s+run\s/,
  /^pnpm\s+run\s/,
  /^npx\s/,
  /^rimraf\s/,
  /^shx\s/,
  /^mkdirp\s/,
];

function isSafeScript(value: string): boolean {
  // Check each command in a chained script (e.g. "tsc && bash build.sh")
  const commands = value.split(/\s*&&\s*|\s*;\s*/);
  return commands.every((cmd) => {
    const trimmed = cmd.trim();
    return SAFE_SCRIPT_PATTERNS.some((p) => p.test(trimmed));
  });
}

/**
 * Check if package.json has new lifecycle scripts.
 * Install-time scripts (preinstall/postinstall) are the #1 attack vector.
 * Publish-time scripts (prepare/prepack) are lower risk since they only
 * run for maintainers, not end users installing from the registry.
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

  // Check install-time scripts (high/critical severity)
  for (const script of INSTALL_SCRIPTS) {
    const newVal = newScripts[script];
    const oldVal = oldScripts[script];

    if (newVal && newVal !== oldVal && !isSafeScript(newVal)) {
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

  // Check publish-time scripts (medium severity — only affects maintainers)
  for (const script of PUBLISH_SCRIPTS) {
    const newVal = newScripts[script];
    const oldVal = oldScripts[script];

    if (newVal && newVal !== oldVal && !isSafeScript(newVal)) {
      // Only flag if it contains suspicious patterns (shell downloads, curl, etc.)
      const suspicious = /curl\s|wget\s|bash\s+-c|eval\s|base64|\.sh\s|http:|https:/i.test(newVal);
      if (!suspicious) continue;

      flags.push({
        rule: 'child-process',
        severity: 'medium',
        filename: 'package.json',
        line: 0,
        snippet: `"${script}": "${newVal}"`,
        description: oldVal
          ? `PUBLISH SCRIPT CHANGED: "${script}" was modified (contains suspicious commands)`
          : `NEW PUBLISH SCRIPT: "${script}" added (contains suspicious commands)`,
      });
    }
  }

  return flags;
}
