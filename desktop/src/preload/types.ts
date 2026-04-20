import type { SearchHit } from '@afe/core';

export interface FileNode {
  name: string;
  path: string;
  isDir: boolean;
  size?: number;
  mtime?: number;
}

export interface IndexStats {
  indexed: number;
  skipped: number;
  scanned: number;
}

export interface AfeApi {
  chooseFolder: () => Promise<string | null>;
  getRoot: () => Promise<string | null>;
  setRoot: (root: string) => Promise<void>;
  listDir: (dir: string) => Promise<FileNode[]>;
  readFile: (path: string) => Promise<string>;
  indexStatus: () => Promise<{ indexing: boolean; root: string | null; stats: IndexStats | null }>;
  startIndex: () => Promise<void>;
  onIndexProgress: (cb: (p: { indexed: number; skipped: number; scanned: number; currentPath?: string; done: boolean }) => void) => () => void;
  search: (query: string) => Promise<SearchHit[]>;
  chat: (query: string) => Promise<{ answer: string; sources: SearchHit[] }>;
  summarize: (path: string) => Promise<string>;
  tag: (path: string) => Promise<string[]>;
  similar: (path: string) => Promise<SearchHit[]>;
  providerName: () => Promise<string>;
}

declare global {
  interface Window {
    afe: AfeApi;
  }
}
