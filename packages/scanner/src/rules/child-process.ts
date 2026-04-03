import type { StaticFlag } from '@ferret/types';
import type { AnalysisRule } from './types.js';
import { parseFile, getSourceLine } from './parse-utils.js';
import traverse from './traverse.js';

// Only flag calls on objects that look like child_process imports
const CP_OBJECT_NAMES = new Set([
  'cp', 'child_process', 'childProcess', 'proc',
  'child', 'subprocess',
]);

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

        // cp.exec(...), childProcess.spawn(...), etc.
        if (
          callee.type === 'MemberExpression' &&
          callee.property.type === 'Identifier' &&
          CP_METHODS.has(callee.property.name) &&
          callee.object.type === 'Identifier' &&
          CP_OBJECT_NAMES.has(callee.object.name)
        ) {
          flags.push({
            rule: 'child-process',
            severity: 'critical',
            filename,
            line: callee.loc?.start.line ?? 0,
            snippet: getSourceLine(code, callee.loc?.start.line),
            description: `Call to ${callee.object.name}.${callee.property.name}()`,
          });
        }
      },
    });

    return flags;
  },
};
