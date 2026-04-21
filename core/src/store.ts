import Database from 'better-sqlite3';
import { createHash } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import type { ChunkRecord, FileRecord } from './types.js';

export interface StoreOptions {
  dataDir: string;
  root: string;
}

export function indexPathForRoot(dataDir: string, root: string): string {
  const hash = createHash('sha1').update(path.resolve(root)).digest('hex').slice(0, 12);
  mkdirSync(dataDir, { recursive: true });
  return path.join(dataDir, `index-${hash}.db`);
}

export class Store {
  readonly db: Database.Database;
  readonly root: string;

  constructor(opts: StoreOptions) {
    this.root = path.resolve(opts.root);
    const file = indexPathForRoot(opts.dataDir, this.root);
    this.db = new Database(file);
    this.db.pragma('journal_mode = WAL');
    this.migrate();
  }

  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        path TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        ext TEXT NOT NULL,
        size INTEGER NOT NULL,
        mtime REAL NOT NULL,
        indexed_at REAL NOT NULL,
        hash TEXT NOT NULL,
        summary TEXT,
        tags TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_files_path ON files(path);

      CREATE TABLE IF NOT EXISTS chunks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_id INTEGER NOT NULL REFERENCES files(id) ON DELETE CASCADE,
        ordinal INTEGER NOT NULL,
        text TEXT NOT NULL,
        embedding BLOB NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_chunks_file ON chunks(file_id);
    `);
  }

  close(): void {
    this.db.close();
  }

  getFileByPath(p: string): FileRecord | undefined {
    const row = this.db
      .prepare('SELECT * FROM files WHERE path = ?')
      .get(path.resolve(p)) as RawFile | undefined;
    return row ? rowToFile(row) : undefined;
  }

  allFiles(): FileRecord[] {
    const rows = this.db.prepare('SELECT * FROM files ORDER BY path').all() as RawFile[];
    return rows.map(rowToFile);
  }

  upsertFile(f: Omit<FileRecord, 'id'>): number {
    const stmt = this.db.prepare(
      `INSERT INTO files (path, name, ext, size, mtime, indexed_at, hash, summary, tags)
       VALUES (@path, @name, @ext, @size, @mtime, @indexedAt, @hash, @summary, @tags)
       ON CONFLICT(path) DO UPDATE SET
         name = excluded.name,
         ext = excluded.ext,
         size = excluded.size,
         mtime = excluded.mtime,
         indexed_at = excluded.indexed_at,
         hash = excluded.hash`
    );
    stmt.run({
      path: f.path,
      name: f.name,
      ext: f.ext,
      size: f.size,
      mtime: f.mtime,
      indexedAt: f.indexedAt,
      hash: f.hash,
      summary: f.summary,
      tags: f.tags,
    });
    const row = this.db.prepare('SELECT id FROM files WHERE path = ?').get(f.path) as { id: number };
    return row.id;
  }

  deleteChunks(fileId: number): void {
    this.db.prepare('DELETE FROM chunks WHERE file_id = ?').run(fileId);
  }

  insertChunks(
    fileId: number,
    chunks: { ordinal: number; text: string; embedding: number[] }[]
  ): void {
    const stmt = this.db.prepare(
      'INSERT INTO chunks (file_id, ordinal, text, embedding) VALUES (?, ?, ?, ?)'
    );
    const insertMany = this.db.transaction(
      (rows: { ordinal: number; text: string; embedding: number[] }[]) => {
        for (const r of rows) {
          const buf = Buffer.alloc(r.embedding.length * 4);
          for (let i = 0; i < r.embedding.length; i++) buf.writeFloatLE(r.embedding[i]!, i * 4);
          stmt.run(fileId, r.ordinal, r.text, buf);
        }
      }
    );
    insertMany(chunks);
  }

  updateSummary(fileId: number, summary: string): void {
    this.db.prepare('UPDATE files SET summary = ? WHERE id = ?').run(summary, fileId);
  }

  updateTags(fileId: number, tags: string[]): void {
    this.db
      .prepare('UPDATE files SET tags = ? WHERE id = ?')
      .run(JSON.stringify(tags), fileId);
  }

  deleteFile(fileId: number): void {
    this.db.prepare('DELETE FROM files WHERE id = ?').run(fileId);
  }

  allChunks(): ChunkRecord[] {
    const rows = this.db.prepare('SELECT * FROM chunks').all() as RawChunk[];
    return rows.map(rowToChunk);
  }

  chunksForFile(fileId: number): ChunkRecord[] {
    const rows = this.db
      .prepare('SELECT * FROM chunks WHERE file_id = ? ORDER BY ordinal')
      .all(fileId) as RawChunk[];
    return rows.map(rowToChunk);
  }

  fileById(id: number): FileRecord | undefined {
    const row = this.db.prepare('SELECT * FROM files WHERE id = ?').get(id) as RawFile | undefined;
    return row ? rowToFile(row) : undefined;
  }
}

interface RawFile {
  id: number;
  path: string;
  name: string;
  ext: string;
  size: number;
  mtime: number;
  indexed_at: number;
  hash: string;
  summary: string | null;
  tags: string | null;
}

interface RawChunk {
  id: number;
  file_id: number;
  ordinal: number;
  text: string;
  embedding: Buffer;
}

function rowToFile(r: RawFile): FileRecord {
  return {
    id: r.id,
    path: r.path,
    name: r.name,
    ext: r.ext,
    size: r.size,
    mtime: r.mtime,
    indexedAt: r.indexed_at,
    hash: r.hash,
    summary: r.summary,
    tags: r.tags,
  };
}

function rowToChunk(r: RawChunk): ChunkRecord {
  const floats = new Float32Array(r.embedding.byteLength / 4);
  for (let i = 0; i < floats.length; i++) floats[i] = r.embedding.readFloatLE(i * 4);
  return {
    id: r.id,
    fileId: r.file_id,
    ordinal: r.ordinal,
    text: r.text,
    embedding: floats,
  };
}
