import { search } from './search.js';
import { Store } from './store.js';
import type { AIProvider, ChatMessage, ChatResponse, SearchHit } from './types.js';

export interface ChatOptions {
  topK?: number;
  history?: ChatMessage[];
}

export async function chat(
  store: Store,
  provider: AIProvider,
  query: string,
  opts: ChatOptions = {}
): Promise<ChatResponse> {
  const hits = await search(store, provider, query, { topK: opts.topK ?? 6 });
  const context = buildContext(hits);
  const history = opts.history ?? [];
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content:
        'You are an assistant that answers questions strictly using the provided file excerpts. ' +
        'Cite sources inline using the numeric markers like [1], [2]. If the answer is not in the ' +
        'excerpts, say you do not have enough information.',
    },
    ...history,
    {
      role: 'user',
      content: `Context:\n${context}\n\nQuestion: ${query}`,
    },
  ];
  const answer = await provider.chat(messages, { temperature: 0.2 });
  return { answer, sources: hits };
}

function buildContext(hits: SearchHit[]): string {
  return hits
    .map((h, i) => `[${i + 1}] ${h.file.path}\n${h.snippet}`)
    .join('\n\n');
}
