import { cosine } from './embeddings.js';
import { Store } from './store.js';
import type { AIProvider, SearchHit } from './types.js';

export interface SearchOptions {
  topK?: number;
}

export async function search(
  store: Store,
  provider: AIProvider,
  query: string,
  opts: SearchOptions = {}
): Promise<SearchHit[]> {
  const topK = opts.topK ?? 10;
  const [qEmb] = await provider.embed([query]);
  if (!qEmb) return [];
  const chunks = store.allChunks();
  const scored = chunks.map((c) => ({ c, score: cosine(c.embedding, qEmb) }));
  scored.sort((a, b) => b.score - a.score);

  const fileBest = new Map<number, { score: number; chunkOrdinal: number; snippet: string }>();
  for (const { c, score } of scored) {
    const prev = fileBest.get(c.fileId);
    if (!prev || score > prev.score) {
      fileBest.set(c.fileId, {
        score,
        chunkOrdinal: c.ordinal,
        snippet: truncate(c.text, 400),
      });
    }
  }
  const hits: SearchHit[] = [];
  for (const [fileId, info] of fileBest) {
    const file = store.fileById(fileId);
    if (!file) continue;
    hits.push({ file, score: info.score, snippet: info.snippet, chunkOrdinal: info.chunkOrdinal });
  }
  hits.sort((a, b) => b.score - a.score);
  return hits.slice(0, topK);
}

function truncate(s: string, max: number): string {
  const flat = s.replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max)}…` : flat;
}
