import { promises as fs } from 'node:fs';
import path from 'node:path';

export interface ScanOptions {
  maxBytes?: number;
  include?: string[];
  exclude?: string[];
}

const DEFAULT_EXCLUDE = new Set([
  'node_modules',
  '.git',
  '.cache',
  'dist',
  'build',
  '.venv',
  '__pycache__',
  '.next',
  '.DS_Store',
]);

const TEXT_EXTS = new Set([
  '.txt',
  '.md',
  '.markdown',
  '.rst',
  '.log',
  '.csv',
  '.tsv',
  '.json',
  '.yaml',
  '.yml',
  '.toml',
  '.ini',
  '.xml',
  '.html',
  '.htm',
  '.css',
  '.scss',
  '.js',
  '.jsx',
  '.ts',
  '.tsx',
  '.py',
  '.rs',
  '.go',
  '.java',
  '.kt',
  '.c',
  '.h',
  '.cpp',
  '.hpp',
  '.cs',
  '.rb',
  '.php',
  '.sh',
  '.bash',
  '.zsh',
  '.sql',
  '.pdf',
  '.docx',
]);

export interface ScannedFile {
  path: string;
  size: number;
  mtime: number;
  ext: string;
}

export async function* walk(root: string, opts: ScanOptions = {}): AsyncGenerator<ScannedFile> {
  const exclude = new Set([...(opts.exclude ?? []), ...Array.from(DEFAULT_EXCLUDE)]);
  yield* walkInner(root, exclude);
}

async function* walkInner(dir: string, exclude: Set<string>): AsyncGenerator<ScannedFile> {
  let entries: import('node:fs').Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (exclude.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkInner(full, exclude);
    } else if (entry.isFile()) {
      try {
        const stat = await fs.stat(full);
        yield {
          path: full,
          size: stat.size,
          mtime: stat.mtimeMs,
          ext: path.extname(entry.name).toLowerCase(),
        };
      } catch {
        // ignore
      }
    }
  }
}

export function isSupported(ext: string): boolean {
  return TEXT_EXTS.has(ext.toLowerCase());
}
