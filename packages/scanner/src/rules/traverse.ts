import _traverse from '@babel/traverse';

// @babel/traverse is CJS — default import gives { default: fn } in ESM
const traverse = (typeof _traverse === 'function'
  ? _traverse
  : (_traverse as unknown as { default: typeof _traverse }).default) as typeof _traverse;

export default traverse;
