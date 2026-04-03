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
      CallExpression(path) {
        const { callee } = path.node;

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
