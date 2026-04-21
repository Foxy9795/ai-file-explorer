import { cosine } from './embeddings.js';
import { Store } from './store.js';
import type { SearchHit } from './types.js';

export function similarFiles(store: Store, filePath: string, topK = 8): SearchHit[] {
  const file = store.getFileByPath(filePath);
  if (!file) return [];
  const baseChunks = store.chunksForFile(file.id);
  if (baseChunks.length === 0) return [];
  const centroid = new Float32Array(baseChunks[0]!.embedding.length);
  for (const c of baseChunks) {
    for (let i = 0; i < centroid.length; i++) centroid[i] += c.embedding[i]!;
  }
  for (let i = 0; i < centroid.length; i++) centroid[i] /= baseChunks.length;

  const allChunks = store.allChunks();
  const fileBest = new Map<number, { score: number; ordinal: number; snippet: string }>();
  for (const c of allChunks) {
    if (c.fileId === file.id) continue;
    const score = cosine(c.embedding, centroid);
    const prev = fileBest.get(c.fileId);
    if (!prev || score > prev.score) {
      fileBest.set(c.fileId, { score, ordinal: c.ordinal, snippet: c.text.slice(0, 400) });
    }
  }
  const hits: SearchHit[] = [];
  for (const [fid, info] of fileBest) {
    const f = store.fileById(fid);
    if (!f) continue;
    hits.push({ file: f, score: info.score, snippet: info.snippet, chunkOrdinal: info.ordinal });
  }
  hits.sort((a, b) => b.score - a.score);
  return hits.slice(0, topK);
}
