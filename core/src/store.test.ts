import { describe, it, expect } from 'vitest';
import { Store } from './store';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

describe('store', () => {
  it('should persist and retrieve files and chunks', () => {
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'afe-test-store-'));
    const store = new Store({ dataDir, root: '/tmp/store-test' });

    const fileId = store.upsertFile({
      path: '/tmp/store-test/f1.txt',
      name: 'f1.txt',
      ext: '.txt',
      size: 100,
      mtime: 12345,
      indexedAt: 67890,
      hash: 'abc',
      summary: 'test summary',
      tags: 'tag1 tag2',
    });

    store.insertChunks(fileId, [
      { ordinal: 1, text: 'chunk 1', embedding: [0.1, 0.2, 0.3] },
      { ordinal: 2, text: 'chunk 2', embedding: [0.4, 0.5, 0.6] },
    ]);

    const retrievedFiles = store.allFiles();
    expect(retrievedFiles.length).toBe(1);
    expect(retrievedFiles[0].name).toBe('f1.txt');
    expect(retrievedFiles[0].summary).toBe('test summary');

    const chunks = store.chunksForFile(fileId);
    expect(chunks.length).toBe(2);
    expect(chunks[0].text).toBe('chunk 1');
    expect(chunks[0].embedding[0]).toBeCloseTo(0.1);

    store.deleteFile(fileId);
    expect(store.allFiles().length).toBe(0);
    expect(store.chunksForFile(fileId).length).toBe(0); // Cascade delete check

    fs.rmSync(dataDir, { recursive: true, force: true });
  });
});
