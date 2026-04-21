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
import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import { promises as fs, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';

let mainWindow: BrowserWindow | null = null;
let store: Store | null = null;
const provider = createProvider();
let indexing = false;
let lastStats: { indexed: number; skipped: number; scanned: number } | null = null;

const dataDir = path.join(app.getPath('userData'), 'afe');
const settingsPath = path.join(dataDir, 'settings.json');

interface Settings {
  root: string | null;
  showHidden?: boolean;
}

let currentSettings: Settings = { root: null, showHidden: false };

function readSettings(): Settings {
  try {
    if (!existsSync(settingsPath)) return { root: null, showHidden: false };
    const raw = require('node:fs').readFileSync(settingsPath, 'utf-8');
    const parsed = JSON.parse(raw) as Settings;
    return { root: parsed.root ?? null, showHidden: parsed.showHidden ?? false };
  } catch {
    return { root: null, showHidden: false };
  }
}

async function writeSettings(s: Settings): Promise<void> {
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
    await writeSettings({ root: currentSettings.root ?? null, showHidden: !!v });
    return currentSettings.showHidden === true;
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
