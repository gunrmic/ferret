import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';

const ANALYZABLE_EXTENSIONS = new Set([
  '.js', '.mjs', '.cjs',
  '.ts', '.mts', '.cts',
  '.jsx', '.tsx',
]);

const MAX_FILE_SIZE = 1_000_000; // 1MB

export interface ModifiedFile {
  path: string;
  oldContent: string;
  newContent: string;
}

export interface DiffResult {
  addedFiles: Array<{ path: string; content: string }>;
  removedFiles: string[];
  modifiedFiles: ModifiedFile[];
}

async function walkDir(dir: string, base?: string): Promise<string[]> {
  const root = base ?? dir;
  const files: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    if (entry.name === 'node_modules') continue;

    if (entry.isDirectory()) {
      files.push(...(await walkDir(fullPath, root)));
    } else if (entry.isFile()) {
      const relPath = relative(root, fullPath);
      const ext = '.' + entry.name.split('.').pop();
      if (!ANALYZABLE_EXTENSIONS.has(ext)) continue;

      const fileStat = await stat(fullPath);
      if (fileStat.size > MAX_FILE_SIZE) continue;

      files.push(relPath);
    }
  }

  return files;
}

export async function diffDirectories(
  oldDir: string | null,
  newDir: string,
): Promise<DiffResult> {
  const newFiles = new Set(await walkDir(newDir));
  const oldFiles = oldDir ? new Set(await walkDir(oldDir)) : new Set<string>();

  const addedFiles: DiffResult['addedFiles'] = [];
  const removedFiles: string[] = [];
  const modifiedFiles: ModifiedFile[] = [];

  // Added files (in new but not in old)
  for (const file of newFiles) {
    if (!oldFiles.has(file)) {
      const content = await readFile(join(newDir, file), 'utf-8');
      addedFiles.push({ path: file, content });
    }
  }

  // Removed files (in old but not in new)
  for (const file of oldFiles) {
    if (!newFiles.has(file)) {
      removedFiles.push(file);
    }
  }

  // Modified files (in both, content differs)
  for (const file of newFiles) {
    if (!oldFiles.has(file)) continue;

    const [oldContent, newContent] = await Promise.all([
      readFile(join(oldDir!, file), 'utf-8'),
      readFile(join(newDir, file), 'utf-8'),
    ]);

    if (oldContent !== newContent) {
      modifiedFiles.push({ path: file, oldContent, newContent });
    }
  }

  return { addedFiles, removedFiles, modifiedFiles };
}
