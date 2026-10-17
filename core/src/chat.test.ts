import { describe, it, expect } from 'vitest';
import { chat } from './chat';
import { Store } from './store';
import * as os from 'os';

describe('chat', () => {
  it('should format retrieved hits correctly', async () => {
    const store = new Store({ dataDir: os.tmpdir(), root: '/tmp/test2' });

    const id1 = store.upsertFile({
      path: '/tmp/test2/f1.txt', name: 'f1.txt', ext: '.txt', size: 10, mtime: 100, indexedAt: 100, hash: 'h1', summary: null, tags: null
    });
    // the previous test might be polluting the DB since they use the same DB location if we aren't careful
    store.insertChunks(id1, [{ ordinal: 1, text: 'mock-chunk-1-from-f1', embedding: [0.9, 0.1, 0.1] }]);

    let promptSent = '';
    const mockProvider = {
      name: 'mock',
      embed: async (texts: string[]) => texts.map(() => [0.9, 0.1, 0.1]),
      chat: async (msgs: { content: string }[]) => {
        promptSent = msgs[msgs.length - 1].content;
        return 'mock answer';
      },
    };

    const res = await chat(store, mockProvider as unknown as import('./types').AIProvider, 'hello', { topK: 1 });
    expect(res.answer).toBe('mock answer');
    expect(res.sources.length).toBe(1);
    expect(promptSent).toContain('mock-chunk-1-from-f1');
  });
});
