import { createHash } from 'node:crypto';
import path from 'node:path';
import { chunkText, extractText } from './extractor.js';
import { isSupported, walk } from './scanner.js';
import { Store } from './store.js';
import type { AIProvider, IndexProgress } from './types.js';

export interface IndexOptions {
  onProgress?: (p: IndexProgress) => void;
}

export async function indexRoot(
  store: Store,
  provider: AIProvider,
  opts: IndexOptions = {}
): Promise<IndexProgress> {
  let scanned = 0;
  let indexed = 0;
  let skipped = 0;
  const progress: IndexProgress = { scanned: 0, indexed: 0, skipped: 0, total: 0, done: false };

  const existing = new Map(store.allFiles().map((f) => [f.path, f]));
  const seen = new Set<string>();

  for await (const file of walk(store.root)) {
    scanned += 1;
    progress.scanned = scanned;
    progress.currentPath = file.path;
    seen.add(file.path);
    if (!isSupported(file.ext)) {
      skipped += 1;
      progress.skipped = skipped;
      opts.onProgress?.({ ...progress });
      continue;
    }
    const prev = existing.get(file.path);
    if (prev && prev.mtime === file.mtime && prev.size === file.size) {
      skipped += 1;
      progress.skipped = skipped;
      opts.onProgress?.({ ...progress });
      continue;
    }

    const text = await extractText(file.path, file.ext);
    const chunks = chunkText(text);
    const hash = createHash('sha1').update(`${file.size}:${file.mtime}:${chunks.length}`).digest('hex');
    const fileId = store.upsertFile({
      path: file.path,
      name: path.basename(file.path),
      ext: file.ext,
      size: file.size,
      mtime: file.mtime,
      indexedAt: Date.now(),
      hash,
      summary: prev?.summary ?? null,
      tags: prev?.tags ?? null,
    });
    store.deleteChunks(fileId);
    if (chunks.length > 0) {
      const embeddings = await provider.embed(chunks);
      store.insertChunks(
        fileId,
        chunks.map((text, i) => ({ ordinal: i, text, embedding: embeddings[i]! }))
      );
    }
    indexed += 1;
    progress.indexed = indexed;
    opts.onProgress?.({ ...progress });
  }

  // Remove files that disappeared from disk.
  for (const [p, f] of existing) {
    if (!seen.has(p)) store.deleteFile(f.id);
  }

  progress.total = scanned;
  progress.done = true;
  opts.onProgress?.({ ...progress });
  return progress;
}
