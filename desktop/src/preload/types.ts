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

export interface StatInfo {
  size: number;
  mtime: number;
  isDir: boolean;
}

export interface AfeApi {
  chooseFolder: () => Promise<string | null>;
  getRoot: () => Promise<string | null>;
  setRoot: (root: string) => Promise<void>;
  listDir: (dir: string) => Promise<FileNode[]>;
  stat: (path: string) => Promise<StatInfo | null>;
  parentDir: (path: string) => Promise<string>;
  pathSep: () => Promise<string>;
  joinPath: (a: string, b: string) => Promise<string>;
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
  getShowHidden: () => Promise<boolean>;
  setShowHidden: (v: boolean) => Promise<boolean>;
  newFile: (dir: string, name: string) => Promise<string>;
  newFolder: (dir: string, name: string) => Promise<string>;
  rename: (oldPath: string, newName: string) => Promise<string>;
  trash: (paths: string[]) => Promise<{ path: string; ok: boolean; error?: string }[]>;
  copyPaths: (paths: string[], destDir: string) => Promise<string[]>;
  movePaths: (paths: string[], destDir: string) => Promise<string[]>;
  pathExists: (p: string) => Promise<boolean>;
  revealInOS: (p: string) => Promise<void>;
  getFavorites: () => Promise<string[]>;
  addFavorite: (p: string) => Promise<string[]>;
  removeFavorite: (p: string) => Promise<string[]>;
  getRecent: () => Promise<string[]>;
  pushRecent: (p: string) => Promise<string[]>;
  clearRecent: () => Promise<string[]>;
}

declare global {
  interface Window {
    afe: AfeApi;
  }
}
