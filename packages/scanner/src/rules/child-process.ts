import type { StaticFlag } from '@ferret/types';
import type { AnalysisRule } from './types.js';
import { parseFile, getSourceLine } from './parse-utils.js';
import traverse from './traverse.js';

const CP_MODULES = new Set(['child_process', 'node:child_process']);
const CP_METHODS = new Set([
  'exec', 'execSync', 'spawn', 'spawnSync',
  'execFile', 'execFileSync', 'fork',
]);

export const childProcessRule: AnalysisRule = {
  name: 'child-process',

  run(code: string, filename: string): StaticFlag[] {
    const ast = parseFile(code, filename);
    if (!ast) return [];

    const flags: StaticFlag[] = [];

    traverse(ast, {
      ImportDeclaration(path) {
        if (CP_MODULES.has(path.node.source.value)) {
          flags.push({
            rule: 'child-process',
            severity: 'critical',
            filename,
            line: path.node.loc?.start.line ?? 0,
            snippet: getSourceLine(code, path.node.loc?.start.line),
            description: `Import of "${path.node.source.value}"`,
          });
        }
      },

      CallExpression(path) {
        const { callee } = path.node;

        // require('child_process')
        if (
          callee.type === 'Identifier' &&
          callee.name === 'require' &&
          path.node.arguments.length > 0 &&
          path.node.arguments[0].type === 'StringLiteral' &&
          CP_MODULES.has(path.node.arguments[0].value)
        ) {
          flags.push({
            rule: 'child-process',
            severity: 'critical',
            filename,
            line: callee.loc?.start.line ?? 0,
            snippet: getSourceLine(code, callee.loc?.start.line),
            description: `require() of "${path.node.arguments[0].value}"`,
          });
        }

        // exec(...), spawn(...), etc. as member expressions
        if (
          callee.type === 'MemberExpression' &&
          callee.property.type === 'Identifier' &&
          CP_METHODS.has(callee.property.name)
        ) {
          flags.push({
            rule: 'child-process',
            severity: 'critical',
            filename,
            line: callee.loc?.start.line ?? 0,
            snippet: getSourceLine(code, callee.loc?.start.line),
            description: `Call to ${callee.property.name}()`,
          });
        }

        // Direct calls like exec(...) after destructured import
        if (
          callee.type === 'Identifier' &&
          CP_METHODS.has(callee.name)
        ) {
          flags.push({
            rule: 'child-process',
            severity: 'high',
            filename,
            line: callee.loc?.start.line ?? 0,
            snippet: getSourceLine(code, callee.loc?.start.line),
            description: `Direct call to ${callee.name}() (possible child_process)`,
          });
        }
      },
    });

    return flags;
  },
};
