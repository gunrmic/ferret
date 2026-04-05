import type { StaticFlag } from '@ferret/types';
import type { AnalysisRule } from './types.js';
import { parseFile, getSourceLine } from './parse-utils.js';
import traverse from './traverse.js';

const FS_MODULES = new Set(['fs', 'node:fs', 'fs/promises', 'node:fs/promises']);
const FS_WRITE_METHODS = new Set([
  'writeFile', 'writeFileSync',
  'appendFile', 'appendFileSync',
  'createWriteStream',
  'rename', 'renameSync',
  'copyFile', 'copyFileSync',
  'mkdir', 'mkdirSync',
]);

export const fsWritesRule: AnalysisRule = {
  name: 'fs-writes',

  run(code: string, filename: string): StaticFlag[] {
    const ast = parseFile(code, filename);
    if (!ast) return [];

    const flags: StaticFlag[] = [];

    // Track destructured imports: const { writeFile } = require('fs')
    const destructuredNames = new Set<string>();

    traverse(ast, {
      VariableDeclarator(path) {
        const { id, init } = path.node;
        if (
          id.type === 'ObjectPattern' &&
          init?.type === 'CallExpression' &&
          init.callee.type === 'Identifier' &&
          init.callee.name === 'require' &&
          init.arguments.length === 1 &&
          init.arguments[0].type === 'StringLiteral' &&
          FS_MODULES.has(init.arguments[0].value)
        ) {
          for (const prop of id.properties) {
            if (
              prop.type === 'ObjectProperty' &&
              prop.value.type === 'Identifier' &&
              FS_WRITE_METHODS.has(prop.value.name)
            ) {
              destructuredNames.add(prop.value.name);
            }
          }
        }
      },

      CallExpression(path) {
        const { callee } = path.node;

        // fs.writeFile(...), etc.
        if (
          callee.type === 'MemberExpression' &&
          callee.property.type === 'Identifier' &&
          FS_WRITE_METHODS.has(callee.property.name)
        ) {
          flags.push({
            rule: 'fs-writes',
            severity: 'medium',
            filename,
            line: callee.loc?.start.line ?? 0,
            snippet: getSourceLine(code, callee.loc?.start.line),
            description: `Filesystem write call: ${callee.property.name}()`,
          });
        }

        // writeFile(...) from destructured require
        if (
          callee.type === 'Identifier' &&
          destructuredNames.has(callee.name)
        ) {
          flags.push({
            rule: 'fs-writes',
            severity: 'medium',
            filename,
            line: callee.loc?.start.line ?? 0,
            snippet: getSourceLine(code, callee.loc?.start.line),
            description: `Destructured fs write call: ${callee.name}()`,
          });
        }
      },
    });

    return flags;
  },
};
