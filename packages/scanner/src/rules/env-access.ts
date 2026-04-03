import type { StaticFlag } from '@ferret/types';
import type { AnalysisRule } from './types.js';
import { parseFile, getSourceLine } from './parse-utils.js';
import traverse from './traverse.js';

// Common env vars that are NOT suspicious
const SAFE_ENV_VARS = new Set([
  'NODE_ENV', 'NODE_DEBUG', 'NODE_PATH', 'NODE_OPTIONS',
  'NODE_EXTRA_CA_CERTS', 'NODE_TLS_REJECT_UNAUTHORIZED',
  'DEBUG', 'VERBOSE', 'LOG_LEVEL', 'CI', 'GITHUB_ACTIONS',
  'TERM', 'LANG', 'SHELL', 'HOME', 'USER', 'PATH', 'PWD', 'TMPDIR',
  'TZ', 'LC_ALL', 'LC_CTYPE', 'LC_MESSAGES',
  'NO_COLOR', 'FORCE_COLOR', 'TERM_PROGRAM', 'COLORTERM',
  'npm_lifecycle_event', 'npm_package_name', 'npm_config_user_agent',
  'JEST_WORKER_ID', 'VITEST', 'TEST', 'TESTING',
  'HOSTNAME', 'PORT', 'HOST',
]);

export const envAccessRule: AnalysisRule = {
  name: 'env-access',

  run(code: string, filename: string): StaticFlag[] {
    const ast = parseFile(code, filename);
    if (!ast) return [];

    const flags: StaticFlag[] = [];

    traverse(ast, {
      MemberExpression(path) {
        const { object, property } = path.node;

        if (
          object.type === 'MemberExpression' &&
          object.object.type === 'Identifier' &&
          object.object.name === 'process' &&
          object.property.type === 'Identifier' &&
          object.property.name === 'env'
        ) {
          const envVar =
            property.type === 'Identifier'
              ? property.name
              : property.type === 'StringLiteral'
                ? property.value
                : 'unknown';

          // Skip known safe env vars
          if (SAFE_ENV_VARS.has(envVar)) return;

          flags.push({
            rule: 'env-access',
            severity: 'medium',
            filename,
            line: path.node.loc?.start.line ?? 0,
            snippet: getSourceLine(code, path.node.loc?.start.line),
            description: `Access to process.env.${envVar}`,
          });
        }
      },

      VariableDeclarator(path) {
        const { init } = path.node;
        if (
          init?.type === 'MemberExpression' &&
          init.object.type === 'Identifier' &&
          init.object.name === 'process' &&
          init.property.type === 'Identifier' &&
          init.property.name === 'env' &&
          path.node.id.type === 'ObjectPattern'
        ) {
          flags.push({
            rule: 'env-access',
            severity: 'medium',
            filename,
            line: path.node.loc?.start.line ?? 0,
            snippet: getSourceLine(code, path.node.loc?.start.line),
            description: 'Destructuring from process.env',
          });
        }
      },
    });

    return flags;
  },
};
