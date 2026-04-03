import type { StaticFlag } from '@ferret/types';
import type { DiffResult } from './differ.js';
import { analyzeFile } from './rules/index.js';

export function analyzeChanges(diff: DiffResult): StaticFlag[] {
  const allFlags: StaticFlag[] = [];

  // Analyze added files (no old code to compare)
  for (const file of diff.addedFiles) {
    allFlags.push(...analyzeFile(file.content, file.path));
  }

  // Analyze modified files (compare old vs new)
  for (const file of diff.modifiedFiles) {
    allFlags.push(
      ...analyzeFile(file.newContent, file.path, file.oldContent),
    );
  }

  // Removed files are not analyzed (nothing new to flag)

  return allFlags;
}
