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

    traverse(ast, {
      CallExpression(path) {
        const { callee } = path.node;

        // fs.writeFile(...), etc. — only flag actual write calls, not imports
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
      },
    });

    return flags;
  },
};
