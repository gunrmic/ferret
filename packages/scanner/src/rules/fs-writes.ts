import type { StaticFlag } from '@ferret/types';
import type { AnalysisRule } from './types.js';
import { parseFile, getSourceLine } from './parse-utils.js';
import traverse from '@babel/traverse';

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
      ImportDeclaration(path) {
        if (FS_MODULES.has(path.node.source.value)) {
          flags.push({
            rule: 'fs-writes',
            severity: 'medium',
            filename,
            line: path.node.loc?.start.line ?? 0,
            snippet: getSourceLine(code, path.node.loc?.start.line),
            description: `Import of filesystem module "${path.node.source.value}"`,
          });
        }
      },

      CallExpression(path) {
        const { callee } = path.node;

        // require('fs') etc.
        if (
          callee.type === 'Identifier' &&
          callee.name === 'require' &&
          path.node.arguments.length > 0 &&
          path.node.arguments[0].type === 'StringLiteral' &&
          FS_MODULES.has(path.node.arguments[0].value)
        ) {
          flags.push({
            rule: 'fs-writes',
            severity: 'medium',
            filename,
            line: callee.loc?.start.line ?? 0,
            snippet: getSourceLine(code, callee.loc?.start.line),
            description: `require() of "${path.node.arguments[0].value}"`,
          });
        }

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
      },
    });

    return flags;
  },
};
