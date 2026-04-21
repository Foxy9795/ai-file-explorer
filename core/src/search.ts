import { cosine } from './embeddings.js';
import { Store } from './store.js';
import type { AIProvider, SearchHit } from './types.js';

export interface SearchOptions {
  topK?: number;
}

const STOPWORDS = new Set([
  'a', 'an', 'and', 'any', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'have',
  'i', 'in', 'is', 'it', 'its', 'of', 'on', 'or', 'that', 'the', 'to', 'was', 'were',
  'what', 'when', 'where', 'which', 'who', 'why', 'with', 'you', 'your', 'me', 'my',
  'about', 'into', 'this', 'these', 'those', 'do', 'does', 'did',
]);

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t));
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
  const qTokens = Array.from(new Set(tokenize(query)));

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
    const lex = lexicalBoost(file.name, info.snippet, qTokens);
    hits.push({
      file,
      score: info.score + lex,
      snippet: info.snippet,
      chunkOrdinal: info.chunkOrdinal,
    });
  }
  hits.sort((a, b) => b.score - a.score);
  return hits.slice(0, topK);
}

function lexicalBoost(filename: string, snippet: string, qTokens: string[]): number {
  if (qTokens.length === 0) return 0;
  const nameTokens = new Set(tokenize(filename));
  const nameHits = qTokens.filter((t) => nameTokens.has(t)).length;
  const nameFrac = nameHits / qTokens.length;
  const snippetLower = snippet.toLowerCase();
  let contentHits = 0;
  for (const t of qTokens) if (snippetLower.includes(t)) contentHits += 1;
  const contentFrac = contentHits / qTokens.length;
  return 0.25 * nameFrac + 0.05 * contentFrac;
}

function truncate(s: string, max: number): string {
  const flat = s.replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max)}…` : flat;
}
