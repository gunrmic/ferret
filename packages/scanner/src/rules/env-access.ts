import type { StaticFlag } from '@ferret/types';
import type { AnalysisRule } from './types.js';
import { parseFile, getSourceLine } from './parse-utils.js';
import traverse from '@babel/traverse';

export const envAccessRule: AnalysisRule = {
  name: 'env-access',

  run(code: string, filename: string): StaticFlag[] {
    const ast = parseFile(code, filename);
    if (!ast) return [];

    const flags: StaticFlag[] = [];

    traverse(ast, {
      MemberExpression(path) {
        const { object, property } = path.node;

        // process.env.SOMETHING or process.env['SOMETHING']
        if (
          object.type === 'MemberExpression' &&
          object.object.type === 'Identifier' &&
          object.object.name === 'process' &&
          object.property.type === 'Identifier' &&
          object.property.name === 'env'
        ) {
          const envVar =
            property.type === 'Identifier'
              ? property.name
              : property.type === 'StringLiteral'
                ? property.value
                : 'unknown';

          flags.push({
            rule: 'env-access',
            severity: 'medium',
            filename,
            line: path.node.loc?.start.line ?? 0,
            snippet: getSourceLine(code, path.node.loc?.start.line),
            description: `Access to process.env.${envVar}`,
          });
        }
      },

      VariableDeclarator(path) {
        // const { SECRET } = process.env
        const { init } = path.node;
        if (
          init?.type === 'MemberExpression' &&
          init.object.type === 'Identifier' &&
          init.object.name === 'process' &&
          init.property.type === 'Identifier' &&
          init.property.name === 'env' &&
          path.node.id.type === 'ObjectPattern'
        ) {
          flags.push({
            rule: 'env-access',
            severity: 'medium',
            filename,
            line: path.node.loc?.start.line ?? 0,
            snippet: getSourceLine(code, path.node.loc?.start.line),
            description: 'Destructuring from process.env',
          });
        }
      },
    });

    return flags;
  },
};
