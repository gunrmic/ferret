import type { StaticFlag } from '@ferret/types';
import type { DiffResult } from './differ.js';
import { analyzeFile } from './rules/index.js';
import { checkLifecycleScripts } from './rules/lifecycle-scripts.js';

const MAX_LINE_LENGTH = 5000;

function isMinifiedContent(code: string): boolean {
  const firstNewline = code.indexOf('\n');
  if (firstNewline === -1) return code.length > MAX_LINE_LENGTH;
  return firstNewline > MAX_LINE_LENGTH;
}

export function analyzeChanges(diff: DiffResult): StaticFlag[] {
  const allFlags: StaticFlag[] = [];

  // Check package.json for new lifecycle scripts
  const newPkgJson = diff.addedFiles.find((f) => f.path === 'package.json');
  const modPkgJson = diff.modifiedFiles.find((f) => f.path === 'package.json');

  if (newPkgJson) {
    allFlags.push(...checkLifecycleScripts(newPkgJson.content, null));
  } else if (modPkgJson) {
    allFlags.push(...checkLifecycleScripts(modPkgJson.newContent, modPkgJson.oldContent));
  }

  // Analyze source files
  for (const file of diff.addedFiles) {
    if (file.path === 'package.json') continue;
    if (isMinifiedContent(file.content)) continue;
    allFlags.push(...analyzeFile(file.content, file.path));
  }

  for (const file of diff.modifiedFiles) {
    if (file.path === 'package.json') continue;
    if (isMinifiedContent(file.newContent)) continue;
    allFlags.push(
      ...analyzeFile(file.newContent, file.path, file.oldContent),
    );
  }

  return allFlags;
}
