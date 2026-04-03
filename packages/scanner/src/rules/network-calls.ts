import type { StaticFlag } from '@ferret/types';
import type { AnalysisRule } from './types.js';
import { parseFile, getSourceLine } from './parse-utils.js';
import traverse from './traverse.js';

const NETWORK_MODULES = new Set([
  'http', 'https', 'node:http', 'node:https',
  'node-fetch', 'axios', 'got', 'undici',
  'superagent', 'request', 'urllib',
]);

export const networkCallsRule: AnalysisRule = {
  name: 'network-calls',

  run(code: string, filename: string): StaticFlag[] {
    const ast = parseFile(code, filename);
    if (!ast) return [];

    const flags: StaticFlag[] = [];

    traverse(ast, {
      ImportDeclaration(path) {
        const source = path.node.source.value;
        if (NETWORK_MODULES.has(source)) {
          flags.push({
            rule: 'network-calls',
            severity: 'high',
            filename,
            line: path.node.loc?.start.line ?? 0,
            snippet: getSourceLine(code, path.node.loc?.start.line),
            description: `Import of network module "${source}"`,
          });
        }
      },

      CallExpression(path) {
        const { callee } = path.node;

        // require('http') etc.
        if (
          callee.type === 'Identifier' &&
          callee.name === 'require' &&
          path.node.arguments.length > 0 &&
          path.node.arguments[0].type === 'StringLiteral' &&
          NETWORK_MODULES.has(path.node.arguments[0].value)
        ) {
          flags.push({
            rule: 'network-calls',
            severity: 'high',
            filename,
            line: callee.loc?.start.line ?? 0,
            snippet: getSourceLine(code, callee.loc?.start.line),
            description: `require() of network module "${path.node.arguments[0].value}"`,
          });
        }

        // fetch(...)
        if (callee.type === 'Identifier' && callee.name === 'fetch') {
          flags.push({
            rule: 'network-calls',
            severity: 'high',
            filename,
            line: callee.loc?.start.line ?? 0,
            snippet: getSourceLine(code, callee.loc?.start.line),
            description: 'Global fetch() call detected',
          });
        }

        // globalThis.fetch(...)
        if (
          callee.type === 'MemberExpression' &&
          callee.object.type === 'Identifier' &&
          callee.object.name === 'globalThis' &&
          callee.property.type === 'Identifier' &&
          callee.property.name === 'fetch'
        ) {
          flags.push({
            rule: 'network-calls',
            severity: 'high',
            filename,
            line: callee.loc?.start.line ?? 0,
            snippet: getSourceLine(code, callee.loc?.start.line),
            description: 'globalThis.fetch() call detected',
          });
        }
      },
    });

    return flags;
  },
};
