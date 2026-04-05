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

const CP_MODULES = new Set([
  'child_process', 'node:child_process',
]);

export const childProcessRule: AnalysisRule = {
  name: 'child-process',

  run(code: string, filename: string): StaticFlag[] {
    const ast = parseFile(code, filename);
    if (!ast) return [];

    const flags: StaticFlag[] = [];

    // Track destructured imports: const { exec } = require('child_process')
    const destructuredNames = new Set<string>();

    traverse(ast, {
      VariableDeclarator(path) {
        const { id, init } = path.node;
        // Match: const { exec, spawn } = require('child_process')
        if (
          id.type === 'ObjectPattern' &&
          init?.type === 'CallExpression' &&
          init.callee.type === 'Identifier' &&
          init.callee.name === 'require' &&
          init.arguments.length === 1 &&
          init.arguments[0].type === 'StringLiteral' &&
          CP_MODULES.has(init.arguments[0].value)
        ) {
          for (const prop of id.properties) {
            if (
              prop.type === 'ObjectProperty' &&
              prop.value.type === 'Identifier' &&
              CP_METHODS.has(prop.value.name)
            ) {
              destructuredNames.add(prop.value.name);
            }
          }
        }
      },

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

        // exec(...) from destructured require
        if (
          callee.type === 'Identifier' &&
          destructuredNames.has(callee.name)
        ) {
          flags.push({
            rule: 'child-process',
            severity: 'critical',
            filename,
            line: callee.loc?.start.line ?? 0,
            snippet: getSourceLine(code, callee.loc?.start.line),
            description: `Destructured child_process call: ${callee.name}()`,
          });
        }
      },
    });

    return flags;
  },
};
