import type { StaticFlag } from '@ferret/types';
import type { AnalysisRule } from './types.js';
import { parseFile, getSourceLine } from './parse-utils.js';
import traverse from './traverse.js';

export const evalUsageRule: AnalysisRule = {
  name: 'eval-usage',

  run(code: string, filename: string): StaticFlag[] {
    const ast = parseFile(code, filename);
    if (!ast) return [];

    const flags: StaticFlag[] = [];

    traverse(ast, {
      CallExpression(path) {
        const { callee } = path.node;

        // eval(...)
        if (callee.type === 'Identifier' && callee.name === 'eval') {
          flags.push({
            rule: 'eval-usage',
            severity: 'critical',
            filename,
            line: callee.loc?.start.line ?? 0,
            snippet: getSourceLine(code, callee.loc?.start.line),
            description: 'Direct eval() call detected',
          });
        }

        // Function(...)
        if (callee.type === 'Identifier' && callee.name === 'Function') {
          flags.push({
            rule: 'eval-usage',
            severity: 'critical',
            filename,
            line: callee.loc?.start.line ?? 0,
            snippet: getSourceLine(code, callee.loc?.start.line),
            description: 'Function() constructor call detected',
          });
        }

        // module._compile(...) — used in event-stream attack
        if (
          callee.type === 'MemberExpression' &&
          callee.object.type === 'Identifier' &&
          callee.object.name === 'module' &&
          callee.property.type === 'Identifier' &&
          callee.property.name === '_compile'
        ) {
          flags.push({
            rule: 'eval-usage',
            severity: 'critical',
            filename,
            line: callee.loc?.start.line ?? 0,
            snippet: getSourceLine(code, callee.loc?.start.line),
            description: 'module._compile() — dynamic code execution (event-stream attack pattern)',
          });
        }

        // vm.runInNewContext / vm.runInThisContext
        if (
          callee.type === 'MemberExpression' &&
          callee.object.type === 'Identifier' &&
          callee.object.name === 'vm' &&
          callee.property.type === 'Identifier' &&
          callee.property.name.startsWith('runIn')
        ) {
          flags.push({
            rule: 'eval-usage',
            severity: 'critical',
            filename,
            line: callee.loc?.start.line ?? 0,
            snippet: getSourceLine(code, callee.loc?.start.line),
            description: `vm.${callee.property.name}() — dynamic code execution`,
          });
        }
      },

      NewExpression(path) {
        const { callee } = path.node;

        if (callee.type === 'Identifier' && callee.name === 'Function') {
          flags.push({
            rule: 'eval-usage',
            severity: 'critical',
            filename,
            line: callee.loc?.start.line ?? 0,
            snippet: getSourceLine(code, callee.loc?.start.line),
            description: 'new Function() constructor detected',
          });
        }
      },
    });

    return flags;
  },
};
