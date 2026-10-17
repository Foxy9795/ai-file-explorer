import { describe, it, expect } from 'vitest';
import { search } from './search';
import { Store } from './store';
import * as os from 'os';

describe('search', () => {
  it('should return hits sorted by score', async () => {
    const store = new Store({ dataDir: os.tmpdir(), root: '/tmp/test' });

    const id1 = store.upsertFile({
      path: '/tmp/test/f1.txt', name: 'f1.txt', ext: '.txt', size: 10, mtime: 100, indexedAt: 100, hash: 'h1', summary: null, tags: null
    });
    const id2 = store.upsertFile({
      path: '/tmp/test/f2.txt', name: 'f2.txt', ext: '.txt', size: 10, mtime: 100, indexedAt: 100, hash: 'h2', summary: null, tags: null
    });

    // add chunks
    store.insertChunks(id1, [{ ordinal: 1, text: 'mock chunk 1', embedding: [0.9, 0.1, 0.1] }]);
    store.insertChunks(id2, [{ ordinal: 1, text: 'mock chunk 2', embedding: [0.1, 0.9, 0.1] }]);

    const mockProvider = {
      name: 'mock',
      embed: async (texts: string[]) => texts.map(() => [0.9, 0.1, 0.1]),
      chat: async () => 'hello',
    };

    const hits = await search(store, mockProvider as unknown as import('./types').AIProvider, 'query f1');
    expect(hits.length).toBe(2);
    expect(hits[0].file.name).toBe('f1.txt'); // Higher dot product
  });
});
