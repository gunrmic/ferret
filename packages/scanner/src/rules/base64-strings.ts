import type { StaticFlag } from '@ferret/types';
import type { AnalysisRule } from './types.js';
import { parseFile, getSourceLine } from './parse-utils.js';
import traverse from './traverse.js';

// Require 100+ chars and at least one padding char or mixed case + digits
// to avoid matching class names, hashes, and identifiers
const BASE64_REGEX = /^[A-Za-z0-9+/]{100,}={0,2}$/;

export const base64StringsRule: AnalysisRule = {
  name: 'base64-strings',

  run(code: string, filename: string): StaticFlag[] {
    const ast = parseFile(code, filename);
    if (!ast) return [];

    const flags: StaticFlag[] = [];

    traverse(ast, {
      StringLiteral(path) {
        if (BASE64_REGEX.test(path.node.value)) {
          flags.push({
            rule: 'base64-strings',
            severity: 'high',
            filename,
            line: path.node.loc?.start.line ?? 0,
            snippet: getSourceLine(code, path.node.loc?.start.line),
            description: `Base64-encoded string detected (${path.node.value.length} chars)`,
          });
        }
      },

      CallExpression(path) {
        const { callee } = path.node;

        // atob(...)
        if (callee.type === 'Identifier' && callee.name === 'atob') {
          flags.push({
            rule: 'base64-strings',
            severity: 'high',
            filename,
            line: callee.loc?.start.line ?? 0,
            snippet: getSourceLine(code, callee.loc?.start.line),
            description: 'atob() call detected (base64 decoding)',
          });
        }

        // Buffer.from(x, 'base64')
        if (
          callee.type === 'MemberExpression' &&
          callee.object.type === 'Identifier' &&
          callee.object.name === 'Buffer' &&
          callee.property.type === 'Identifier' &&
          callee.property.name === 'from' &&
          path.node.arguments.length >= 2 &&
          path.node.arguments[1].type === 'StringLiteral' &&
          path.node.arguments[1].value === 'base64'
        ) {
          flags.push({
            rule: 'base64-strings',
            severity: 'high',
            filename,
            line: callee.loc?.start.line ?? 0,
            snippet: getSourceLine(code, callee.loc?.start.line),
            description: 'Buffer.from() with base64 encoding detected',
          });
        }
      },
    });

    return flags;
  },
};
