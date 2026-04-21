import {
  chat as chatFn,
  createProvider,
  indexRoot,
  search as searchFn,
  similarFiles,
  Store,
  summarizeFile,
  tagFile,
} from '@afe/core';
import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import { promises as fs, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';

let mainWindow: BrowserWindow | null = null;
let store: Store | null = null;
const provider = createProvider();
let indexing = false;
let lastStats: { indexed: number; skipped: number; scanned: number } | null = null;

const dataDir = path.join(app.getPath('userData'), 'afe');
const settingsPath = path.join(dataDir, 'settings.json');

type ThemeMode = 'dark' | 'light' | 'auto';
type Density = 'compact' | 'normal' | 'comfy';

interface UiSettings {
  theme: ThemeMode;
  accent: string;
  density: Density;
  opacity: number;
  provider: {
    ollamaBaseUrl: string;
    ollamaChatModel: string;
    ollamaEmbedModel: string;
    openaiApiKey: string;
    openaiChatModel: string;
    openaiEmbedModel: string;
    anthropicApiKey: string;
    anthropicChatModel: string;
  };
}

interface Settings {
  root: string | null;
  showHidden?: boolean;
  favorites?: string[];
  recent?: string[];
  ui?: UiSettings;
}

const DEFAULT_UI: UiSettings = {
  theme: 'dark',
  accent: '#7aa7ff',
  density: 'normal',
  opacity: 1.0,
  provider: {
    ollamaBaseUrl: 'http://127.0.0.1:11434',
    ollamaChatModel: 'llama3.2:1b',
    ollamaEmbedModel: 'nomic-embed-text',
    openaiApiKey: '',
    openaiChatModel: 'gpt-4o-mini',
    openaiEmbedModel: 'text-embedding-3-small',
    anthropicApiKey: '',
    anthropicChatModel: 'claude-3-5-haiku-latest',
  },
};

const DEFAULT_SETTINGS: Settings = {
  root: null,
  showHidden: false,
  favorites: [],
  recent: [],
  ui: DEFAULT_UI,
};
const RECENT_MAX = 20;

function normalizeUi(input: unknown): UiSettings {
  const u = (input as Partial<UiSettings>) ?? {};
  const p = (u.provider ?? {}) as Partial<UiSettings['provider']>;
  return {
    theme: u.theme === 'light' || u.theme === 'auto' ? u.theme : 'dark',
    accent: typeof u.accent === 'string' && /^#[0-9a-fA-F]{6}$/.test(u.accent) ? u.accent : DEFAULT_UI.accent,
    density: u.density === 'compact' || u.density === 'comfy' ? u.density : 'normal',
    opacity: typeof u.opacity === 'number' && u.opacity >= 0.6 && u.opacity <= 1 ? u.opacity : 1,
    provider: {
      ollamaBaseUrl: p.ollamaBaseUrl ?? DEFAULT_UI.provider.ollamaBaseUrl,
      ollamaChatModel: p.ollamaChatModel ?? DEFAULT_UI.provider.ollamaChatModel,
      ollamaEmbedModel: p.ollamaEmbedModel ?? DEFAULT_UI.provider.ollamaEmbedModel,
      openaiApiKey: p.openaiApiKey ?? '',
      openaiChatModel: p.openaiChatModel ?? DEFAULT_UI.provider.openaiChatModel,
      openaiEmbedModel: p.openaiEmbedModel ?? DEFAULT_UI.provider.openaiEmbedModel,
      anthropicApiKey: p.anthropicApiKey ?? '',
      anthropicChatModel: p.anthropicChatModel ?? DEFAULT_UI.provider.anthropicChatModel,
    },
  };
}

let currentSettings: Settings = { ...DEFAULT_SETTINGS };

function readSettings(): Settings {
  try {
    if (!existsSync(settingsPath)) return { ...DEFAULT_SETTINGS, ui: { ...DEFAULT_UI } };
    const raw = require('node:fs').readFileSync(settingsPath, 'utf-8');
    const parsed = JSON.parse(raw) as Settings;
    return {
      root: parsed.root ?? null,
      showHidden: parsed.showHidden ?? false,
      favorites: Array.isArray(parsed.favorites) ? parsed.favorites : [],
      recent: Array.isArray(parsed.recent) ? parsed.recent : [],
      ui: normalizeUi(parsed.ui),
    };
  } catch {
    return { ...DEFAULT_SETTINGS, ui: { ...DEFAULT_UI } };
  }
}

async function writeSettings(s: Partial<Settings>): Promise<void> {
  mkdirSync(dataDir, { recursive: true });
  currentSettings = { ...currentSettings, ...s };
  await fs.writeFile(settingsPath, JSON.stringify(currentSettings, null, 2));
}

function openStore(root: string): Store {
  if (store) {
    store.close();
    store = null;
  }
  store = new Store({ dataDir: path.join(dataDir, 'indexes'), root });
  return store;
}

function requireStore(): Store {
  if (!store) throw new Error('No folder selected yet');
  return store;
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 600,
    title: 'AI File Explorer',
    backgroundColor: '#0f1115',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  const devServerUrl = process.env['ELECTRON_RENDERER_URL'];
  if (devServerUrl) {
    mainWindow.loadURL(devServerUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  currentSettings = readSettings();
  if (currentSettings.root) {
    try {
      openStore(currentSettings.root);
    } catch (err) {
      console.error('Failed to open store for persisted root', err);
    }
  }
  registerIpc();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

function registerIpc(): void {
  ipcMain.handle('afe:providerName', () => provider.name);

  ipcMain.handle('afe:getShowHidden', () => currentSettings.showHidden === true);

  ipcMain.handle('afe:setShowHidden', async (_e, v: boolean) => {
    await writeSettings({ showHidden: !!v });
    return currentSettings.showHidden === true;
  });

  ipcMain.handle('afe:getFavorites', () => [...(currentSettings.favorites ?? [])]);

  ipcMain.handle('afe:addFavorite', async (_e, p: string) => {
    const favs = [...(currentSettings.favorites ?? [])];
    if (!favs.includes(p)) favs.push(p);
    await writeSettings({ favorites: favs });
    return favs;
  });

  ipcMain.handle('afe:removeFavorite', async (_e, p: string) => {
    const favs = (currentSettings.favorites ?? []).filter((f) => f !== p);
    await writeSettings({ favorites: favs });
    return favs;
  });

  ipcMain.handle('afe:getRecent', () => [...(currentSettings.recent ?? [])]);

  ipcMain.handle('afe:pushRecent', async (_e, p: string) => {
    const prev = (currentSettings.recent ?? []).filter((r) => r !== p);
    const next = [p, ...prev].slice(0, RECENT_MAX);
    await writeSettings({ recent: next });
    return next;
  });

  ipcMain.handle('afe:clearRecent', async () => {
    await writeSettings({ recent: [] });
    return [];
  });

  ipcMain.handle('afe:getUiSettings', () => {
    return currentSettings.ui ?? { ...DEFAULT_UI };
  });

  ipcMain.handle('afe:setUiSettings', async (_e, patch: Partial<UiSettings>) => {
    const current = currentSettings.ui ?? { ...DEFAULT_UI };
    const merged: UiSettings = {
      ...current,
      ...patch,
      provider: { ...current.provider, ...(patch.provider ?? {}) },
    };
    const next = normalizeUi(merged);
    await writeSettings({ ui: next });
    return next;
  });

  ipcMain.handle('afe:resetUiSettings', async () => {
    await writeSettings({ ui: { ...DEFAULT_UI } });
    return { ...DEFAULT_UI };
  });

  ipcMain.handle('afe:exportSettings', async () => {
    const res = await dialog.showSaveDialog({
      title: 'Export settings',
      defaultPath: 'afe-settings.json',
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });
    if (res.canceled || !res.filePath) return { saved: false };
    const payload = {
      ui: currentSettings.ui ?? { ...DEFAULT_UI },
      showHidden: currentSettings.showHidden ?? false,
      favorites: currentSettings.favorites ?? [],
    };
    await fs.writeFile(res.filePath, JSON.stringify(payload, null, 2), 'utf-8');
    return { saved: true, path: res.filePath };
  });

  ipcMain.handle('afe:importSettings', async () => {
    const res = await dialog.showOpenDialog({
      title: 'Import settings',
      properties: ['openFile'],
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });
    if (res.canceled || res.filePaths.length === 0) return { imported: false };
    const raw = await fs.readFile(res.filePaths[0]!, 'utf-8');
    const parsed = JSON.parse(raw) as { ui?: unknown; showHidden?: boolean; favorites?: string[] };
    const nextUi = normalizeUi(parsed.ui);
    const patch: Partial<Settings> = { ui: nextUi };
    if (typeof parsed.showHidden === 'boolean') patch.showHidden = parsed.showHidden;
    if (Array.isArray(parsed.favorites)) patch.favorites = parsed.favorites.filter((x) => typeof x === 'string');
    await writeSettings(patch);
    return { imported: true, settings: nextUi };
  });

  ipcMain.handle('afe:chooseFolder', async () => {
    const res = await dialog.showOpenDialog({ properties: ['openDirectory'] });
    if (res.canceled || res.filePaths.length === 0) return null;
    const picked = res.filePaths[0]!;
    openStore(picked);
    await writeSettings({ root: picked });
    lastStats = null;
    return picked;
  });

  ipcMain.handle('afe:getRoot', () => store?.root ?? null);

  ipcMain.handle('afe:setRoot', async (_e, root: string) => {
    openStore(root);
    await writeSettings({ root });
    lastStats = null;
  });

  ipcMain.handle('afe:listDir', async (_e, dir: string) => {
    const s = requireStore();
    const target = dir ? dir : s.root;
    const entries = await fs.readdir(target, { withFileTypes: true });
    const showHidden = currentSettings.showHidden === true;
    const out = await Promise.all(
      entries
        .filter((e) => showHidden || !e.name.startsWith('.'))
        .map(async (e) => {
          const full = path.join(target, e.name);
          let size: number | undefined;
          let mtime: number | undefined;
          try {
            const st = await fs.stat(full);
            size = st.size;
            mtime = st.mtimeMs;
          } catch {
            // fall through with undefined size/mtime (e.g. symlink to missing file)
          }
          return { name: e.name, path: full, isDir: e.isDirectory(), size, mtime };
        })
    );
    out.sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    return out;
  });

  ipcMain.handle('afe:stat', async (_e, p: string) => {
    try {
      const st = await fs.stat(p);
      return {
        size: st.size,
        mtime: st.mtimeMs,
        isDir: st.isDirectory(),
      };
    } catch {
      return null;
    }
  });

  ipcMain.handle('afe:parentDir', (_e, p: string) => path.dirname(p));
  ipcMain.handle('afe:pathSep', () => path.sep);
  ipcMain.handle('afe:joinPath', (_e, a: string, b: string) => path.join(a, b));

  async function uniquePath(dir: string, name: string): Promise<string> {
    let candidate = path.join(dir, name);
    if (!existsSync(candidate)) return candidate;
    const dot = name.lastIndexOf('.');
    const stem = dot > 0 ? name.slice(0, dot) : name;
    const ext = dot > 0 ? name.slice(dot) : '';
    for (let i = 2; i < 1000; i++) {
      candidate = path.join(dir, `${stem} (${i})${ext}`);
      if (!existsSync(candidate)) return candidate;
    }
    throw new Error(`Too many conflicts for ${name}`);
  }

  ipcMain.handle('afe:newFile', async (_e, dir: string, name: string) => {
    const p = await uniquePath(dir, name);
    await fs.writeFile(p, '', { flag: 'wx' });
    return p;
  });

  ipcMain.handle('afe:newFolder', async (_e, dir: string, name: string) => {
    const p = await uniquePath(dir, name);
    await fs.mkdir(p, { recursive: false });
    return p;
  });

  ipcMain.handle('afe:rename', async (_e, oldPath: string, newName: string) => {
    if (!newName || newName.includes('/') || newName.includes('\\') || newName === '.' || newName === '..') {
      throw new Error('Invalid name');
    }
    const parent = path.dirname(oldPath);
    const target = path.join(parent, newName);
    if (target === oldPath) return oldPath;
    if (existsSync(target)) throw new Error(`A file named "${newName}" already exists`);
    await fs.rename(oldPath, target);
    return target;
  });

  ipcMain.handle('afe:trash', async (_e, paths: string[]) => {
    const results: { path: string; ok: boolean; error?: string }[] = [];
    for (const p of paths) {
      try {
        await shell.trashItem(p);
        results.push({ path: p, ok: true });
      } catch (err) {
        results.push({ path: p, ok: false, error: (err as Error).message });
      }
    }
    return results;
  });

  async function copyRecursive(src: string, dest: string): Promise<void> {
    const st = await fs.stat(src);
    if (st.isDirectory()) {
      await fs.mkdir(dest, { recursive: false });
      const names = await fs.readdir(src);
      for (const name of names) {
        await copyRecursive(path.join(src, name), path.join(dest, name));
      }
    } else {
      await fs.copyFile(src, dest);
    }
  }

  ipcMain.handle('afe:copyPaths', async (_e, paths: string[], destDir: string) => {
    const out: string[] = [];
    for (const src of paths) {
      if (path.dirname(src) === destDir) {
        const name = path.basename(src);
        const target = await uniquePath(destDir, name);
        await copyRecursive(src, target);
        out.push(target);
      } else {
        const target = await uniquePath(destDir, path.basename(src));
        await copyRecursive(src, target);
        out.push(target);
      }
    }
    return out;
  });

  ipcMain.handle('afe:movePaths', async (_e, paths: string[], destDir: string) => {
    const out: string[] = [];
    for (const src of paths) {
      if (path.dirname(src) === destDir) {
        out.push(src);
        continue;
      }
      const target = await uniquePath(destDir, path.basename(src));
      try {
        await fs.rename(src, target);
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === 'EXDEV') {
          await copyRecursive(src, target);
          await fs.rm(src, { recursive: true, force: true });
        } else {
          throw err;
        }
      }
      out.push(target);
    }
    return out;
  });

  ipcMain.handle('afe:pathExists', async (_e, p: string) => existsSync(p));

  ipcMain.handle('afe:revealInOS', async (_e, p: string) => {
    shell.showItemInFolder(p);
  });

  ipcMain.handle('afe:readFile', async (_e, p: string) => {
    try {
      const stat = await fs.stat(p);
      if (stat.size > 200_000) {
        const handle = await fs.open(p, 'r');
        const buf = Buffer.alloc(200_000);
        await handle.read(buf, 0, 200_000, 0);
        await handle.close();
        return buf.toString('utf-8') + '\n\n…(truncated)';
      }
      return await fs.readFile(p, 'utf-8');
    } catch (err) {
      return `(cannot preview file: ${(err as Error).message})`;
    }
  });

  ipcMain.handle('afe:readBinaryBase64', async (_e, p: string, maxBytes?: number) => {
    const stat = await fs.stat(p);
    const cap = typeof maxBytes === 'number' && maxBytes > 0 ? maxBytes : 25_000_000;
    if (stat.size > cap) {
      throw new Error(`File too large (${stat.size} > ${cap})`);
    }
    const buf = await fs.readFile(p);
    return { base64: buf.toString('base64'), size: stat.size };
  });

  ipcMain.handle('afe:indexStatus', () => ({
    indexing,
    root: store?.root ?? null,
    stats: lastStats,
  }));

  ipcMain.handle('afe:startIndex', async () => {
    const s = requireStore();
    if (indexing) return;
    indexing = true;
    try {
      const result = await indexRoot(s, provider, {
        onProgress: (p) => {
          mainWindow?.webContents.send('afe:indexProgress', p);
        },
      });
      lastStats = {
        indexed: result.indexed,
        skipped: result.skipped,
        scanned: result.scanned,
      };
    } finally {
      indexing = false;
    }
  });

  ipcMain.handle('afe:search', async (_e, query: string) => {
    return searchFn(requireStore(), provider, query, { topK: 10 });
  });

  ipcMain.handle('afe:chat', async (_e, query: string) => {
    return chatFn(requireStore(), provider, query, { topK: 6 });
  });

  ipcMain.handle('afe:summarize', async (_e, p: string) => {
    return summarizeFile(requireStore(), provider, p);
  });

  ipcMain.handle('afe:tag', async (_e, p: string) => {
    return tagFile(requireStore(), provider, p);
  });

  ipcMain.handle('afe:similar', async (_e, p: string) => {
    return similarFiles(requireStore(), p, 8);
  });
}
