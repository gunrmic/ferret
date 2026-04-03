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
      CallExpression(path) {
        const { callee } = path.node;

        // cp.exec(...), cp.spawn(...), etc. — only flag if the object
        // looks like a child_process import (not regex.exec, cursor.exec, etc.)
        if (
          callee.type === 'MemberExpression' &&
          callee.property.type === 'Identifier' &&
          CP_METHODS.has(callee.property.name)
        ) {
          // Only flag if the object is NOT a common false-positive pattern
          const objName =
            callee.object.type === 'Identifier' ? callee.object.name : '';
          const isFalsePositive =
            callee.property.name === 'exec' &&
            !['cp', 'child_process', 'childProcess', 'proc'].includes(objName);

          if (!isFalsePositive) {
            flags.push({
              rule: 'child-process',
              severity: 'critical',
              filename,
              line: callee.loc?.start.line ?? 0,
              snippet: getSourceLine(code, callee.loc?.start.line),
              description: `Call to ${callee.property.name}()`,
            });
          }
        }
      },
    });

    return flags;
  },
};
