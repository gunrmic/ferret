import { parse, type ParserPlugin } from '@babel/parser';
import type { File } from '@babel/types';

export function parseFile(code: string, filename: string): File | null {
  const plugins: ParserPlugin[] = ['typescript', 'jsx', 'decorators'];

  try {
    return parse(code, {
      sourceType: 'unambiguous',
      plugins,
      errorRecovery: true,
    });
  } catch {
    // If parsing completely fails even with error recovery, skip this file
    return null;
  }
}

export function getSourceLine(code: string, line: number | undefined): string {
  if (!line) return '';
  const lines = code.split('\n');
  return (lines[line - 1] ?? '').trim().slice(0, 200);
}
