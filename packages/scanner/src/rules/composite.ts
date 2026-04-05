import type { StaticFlag } from '@ferret/types';
import type { AnalysisRule } from './types.js';

/**
 * Composite rules detect multi-signal attack patterns within a single file.
 * These patterns are based on real npm supply chain attacks:
 * - event-stream: crypto.createDecipher + module._compile
 * - eslint-scope: fs.readFileSync(.npmrc) + https.request
 * - ua-parser-js/coa: child_process.exec + curl/wget
 * - node-ipc: https.get(geolocation) + fs.writeFileSync in loop
 * - crossenv: JSON.stringify(process.env) + http.request
 */
export const compositeRule: AnalysisRule = {
  name: 'eval-usage', // Use eval-usage as the rule type since these are critical

  run(code: string, filename: string): StaticFlag[] {
    const flags: StaticFlag[] = [];

    // CREDENTIAL_EXFIL: reading known credential files + network
    const credentialPaths = [
      '.npmrc', '.env', '.ssh', '.aws', '.docker',
      '.netrc', '.git-credentials', '.gnupg',
    ];
    const readsCredFile = credentialPaths.some((p) => code.includes(p));
    // Also detect computed paths: path.join(home, '.npmrc'), path.resolve(..., '.ssh')
    const readsCredViaPath = /path\.(join|resolve)\([^)]*(['"]\.npmrc|['"]\.env|['"]\.ssh|['"]\.aws|['"]\.docker|['"]\.netrc|['"]\.git-credentials|['"]\.gnupg)/.test(code);
    const hasNetwork =
      /https?\.request|https?\.get\(|fetch\(|net\.connect|require\(['"]https?['"]\)/.test(code);

    if ((readsCredFile || readsCredViaPath) && hasNetwork) {
      flags.push({
        rule: 'eval-usage',
        severity: 'critical',
        filename,
        line: 0,
        snippet: '',
        description: 'CREDENTIAL EXFIL: reads credential file (.npmrc/.env/.ssh) and makes network request in same file',
      });
    }

    // ENV_EXFIL: serializing entire process.env + network
    if (
      /JSON\.stringify\(process\.env\)/.test(code) ||
      /Object\.keys\(process\.env\)/.test(code) ||
      /Object\.entries\(process\.env\)/.test(code)
    ) {
      if (hasNetwork) {
        flags.push({
          rule: 'eval-usage',
          severity: 'critical',
          filename,
          line: 0,
          snippet: '',
          description: 'ENV EXFIL: serializes entire process.env and makes network request (crossenv attack pattern)',
        });
      }
    }

    // INSTALL_SCRIPT_RCE: child_process + shell download commands
    const shellDownload =
      /curl\s|wget\s|certutil|regsvr32|powershell|Start-Process|\|\s*bash|\|\s*sh\b/.test(code);
    const hasChildProcess =
      /child_process|require\s*\(\s*['"]child_process['"]\)|require\s*\(\s*['"]node:child_process['"]/.test(code);

    if (hasChildProcess && shellDownload) {
      flags.push({
        rule: 'child-process',
        severity: 'critical',
        filename,
        line: 0,
        snippet: '',
        description: 'INSTALL SCRIPT RCE: child_process with shell download command (ua-parser-js/coa attack pattern)',
      });
    }

    // DYNAMIC_CODE_EXEC: decryption/decoding + code execution
    const hasDecryption =
      /createDecipher|createDecipheriv/.test(code);
    const hasCodeExec =
      /module\._compile|eval\(|new\s+Function\(|vm\.runIn/.test(code);

    if (hasDecryption && hasCodeExec) {
      flags.push({
        rule: 'eval-usage',
        severity: 'critical',
        filename,
        line: 0,
        snippet: '',
        description: 'DYNAMIC CODE EXEC: decrypts data and executes it as code (event-stream attack pattern)',
      });
    }

    // OBFUSCATED_EXEC: base64 decode + code execution
    const hasBase64Decode =
      /Buffer\.from\([^)]*,\s*['"]base64['"]\)|atob\(/.test(code);

    if (hasBase64Decode && hasCodeExec) {
      flags.push({
        rule: 'eval-usage',
        severity: 'critical',
        filename,
        line: 0,
        snippet: '',
        description: 'OBFUSCATED EXEC: decodes base64 and executes as code',
      });
    }

    // PLATFORM_SWITCH_EXEC: platform detection + child_process
    const hasPlatformSwitch =
      /process\.platform/.test(code);

    if (hasPlatformSwitch && hasChildProcess) {
      flags.push({
        rule: 'child-process',
        severity: 'critical',
        filename,
        line: 0,
        snippet: '',
        description: 'PLATFORM SWITCH EXEC: platform-specific child_process execution (ua-parser-js/coa pattern)',
      });
    }

    // DESTRUCTIVE_WRITE: recursive directory walk + uniform file writes
    const hasRecursiveRead =
      /readdirSync|readdir\(|walk|glob/.test(code);
    const hasWriteFile =
      /writeFileSync|writeFile\(/.test(code);

    if (hasRecursiveRead && hasWriteFile && !/node_modules/.test(filename)) {
      // Check if the write content looks uniform (same content written to many files)
      // This is a heuristic — node-ipc wrote '❤️' to every file
      flags.push({
        rule: 'fs-writes',
        severity: 'high',
        filename,
        line: 0,
        snippet: '',
        description: 'DESTRUCTIVE WRITE: recursive directory read + file write in same file (node-ipc pattern)',
      });
    }

    // GEO_TARGETING: IP geolocation API + destructive action
    const hasGeoAPI =
      /ipgeolocation|ip-api|ipapi|geoip|country_code|country_code2/.test(code);

    if (hasGeoAPI && (hasWriteFile || hasChildProcess)) {
      flags.push({
        rule: 'eval-usage',
        severity: 'critical',
        filename,
        line: 0,
        snippet: '',
        description: 'GEO TARGETING: IP geolocation check + destructive action (node-ipc protestware pattern)',
      });
    }

    return flags;
  },
};
