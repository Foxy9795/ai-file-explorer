import { describe, it, expect } from 'vitest';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { walk } from './scanner';

describe('scanner', () => {
  it('should scan files excluding node_modules by default', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'afe-test-'));
    fs.writeFileSync(path.join(tempDir, 'visible.txt'), 'hello');
    fs.mkdirSync(path.join(tempDir, 'node_modules'));
    fs.writeFileSync(path.join(tempDir, 'node_modules', 'hidden.txt'), 'hidden');
    fs.mkdirSync(path.join(tempDir, 'subfolder'));
    fs.writeFileSync(path.join(tempDir, 'subfolder', 'visible2.txt'), 'world');

    const files = [];
    for await (const f of walk(tempDir)) {
      files.push(f);
    }

    expect(files.length).toBe(2);
    expect(files.map(f => path.basename(f.path)).sort()).toEqual(['visible.txt', 'visible2.txt']);

    fs.rmSync(tempDir, { recursive: true, force: true });
  });
});
