import { useCallback, useEffect, useMemo, useState } from 'react';
import { AIPanel } from './components/AIPanel';
import { AddressBar } from './components/AddressBar';
import { ContextMenu, type MenuItem } from './components/ContextMenu';
import { FileList } from './components/FileList';
import { FilePreview } from './components/FilePreview';
import { NavRail } from './components/NavRail';
import { PlacesSidebar } from './components/PlacesSidebar';
import { SecondaryPane } from './components/SecondaryPane';
import { SettingsPage } from './components/SettingsPage';
import type { FileNode, UiSettings } from '../../preload/types';
import type { Section, SortDir, SortKey, ViewMode } from './types';

type Clipboard = { mode: 'copy' | 'cut'; paths: string[] } | null;

export function App(): JSX.Element {
  const [root, setRoot] = useState<string | null>(null);
  const [provider, setProvider] = useState<string>('');
  const [section, setSection] = useState<Section>('explorer');
  const [currentPath, setCurrentPath] = useState<string | null>(null);
  const [historyBack, setHistoryBack] = useState<string[]>([]);
  const [historyForward, setHistoryForward] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [filter, setFilter] = useState('');
  const [previewOpen, setPreviewOpen] = useState(true);
  const [aiPanelOpen, setAIPanelOpen] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const [indexing, setIndexing] = useState(false);
  const [progress, setProgress] = useState<{ scanned: number; indexed: number; skipped: number; currentPath?: string } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [clipboard, setClipboard] = useState<Clipboard>(null);
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number; items: MenuItem[] } | null>(null);
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [dropActive, setDropActive] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [splitOn, setSplitOn] = useState(false);
  const [secondaryPath, setSecondaryPath] = useState<string | null>(null);
  const [splitKey, setSplitKey] = useState(0);
  const [uiSettings, setUiSettings] = useState<UiSettings | null>(null);

  const cutPaths = useMemo(() => new Set(clipboard?.mode === 'cut' ? clipboard.paths : []), [clipboard]);

  const flashToast = useCallback((kind: 'ok' | 'err', text: string) => {
    setToast({ kind, text });
    window.setTimeout(() => setToast(null), 2400);
  }, []);

  useEffect(() => {
    (async () => {
      const r = await window.afe.getRoot();
      setRoot(r);
      if (r) setCurrentPath(r);
      const p = await window.afe.providerName();
      setProvider(p);
      const sh = await window.afe.getShowHidden();
      setShowHidden(sh);
      const fav = await window.afe.getFavorites();
      setFavorites(fav);
      const rec = await window.afe.getRecent();
      setRecent(rec);
      const ui = await window.afe.getUiSettings();
      setUiSettings(ui);
    })();
  }, []);

  useEffect(() => {
    if (!uiSettings) return;
    const root = document.documentElement;
    const resolveTheme = (): 'dark' | 'light' => {
      if (uiSettings.theme === 'auto') {
        return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
      }
      return uiSettings.theme;
    };
    root.setAttribute('data-theme', resolveTheme());
    root.setAttribute('data-density', uiSettings.density);
    root.style.setProperty('--accent', uiSettings.accent);
    root.style.setProperty('--accent-dim', hexWithAlpha(uiSettings.accent, 0.28));
    root.style.setProperty('--app-opacity', String(uiSettings.opacity));
  }, [uiSettings]);

  const updateUi = useCallback(async (patch: Partial<UiSettings>) => {
    const next = await window.afe.setUiSettings(patch);
    setUiSettings(next);
  }, []);

  const exportUi = useCallback(async () => {
    const res = await window.afe.exportSettings();
    if (res.saved) flashToast('ok', `Saved to ${res.path}`);
  }, [flashToast]);

  const importUi = useCallback(async () => {
    const res = await window.afe.importSettings();
    if (res.imported && res.settings) {
      setUiSettings(res.settings);
      flashToast('ok', 'Settings imported');
    }
  }, [flashToast]);

  const resetUi = useCallback(async () => {
    const next = await window.afe.resetUiSettings();
    setUiSettings(next);
    flashToast('ok', 'Settings reset to defaults');
  }, [flashToast]);

  useEffect(() => {
    if (!currentPath) return;
    (async () => {
      const next = await window.afe.pushRecent(currentPath);
      setRecent(next);
    })();
  }, [currentPath]);

  const toggleFavorite = useCallback(async () => {
    if (!currentPath) return;
    const isFav = favorites.includes(currentPath);
    const next = isFav
      ? await window.afe.removeFavorite(currentPath)
      : await window.afe.addFavorite(currentPath);
    setFavorites(next);
    flashToast('ok', isFav ? 'Removed from favorites' : 'Added to favorites');
  }, [currentPath, favorites, flashToast]);

  const clearRecent = useCallback(async () => {
    const next = await window.afe.clearRecent();
    setRecent(next);
  }, []);

  const removeFavorite = useCallback(async (p: string) => {
    const next = await window.afe.removeFavorite(p);
    setFavorites(next);
  }, []);

  const toggleHidden = useCallback(async () => {
    const next = !showHidden;
    await window.afe.setShowHidden(next);
    setShowHidden(next);
    setRefreshKey((n) => n + 1);
  }, [showHidden]);

  useEffect(() => {
    return window.afe.onIndexProgress((p) => {
      setProgress({ scanned: p.scanned, indexed: p.indexed, skipped: p.skipped, currentPath: p.currentPath });
      if (p.done) {
        setIndexing(false);
        setRefreshKey((n) => n + 1);
      }
    });
  }, []);

  const chooseFolder = useCallback(async () => {
    const r = await window.afe.chooseFolder();
    if (r) {
      setRoot(r);
      setCurrentPath(r);
      setHistoryBack([]);
      setHistoryForward([]);
      setSelected(null);
      setProgress(null);
      setFilter('');
    }
  }, []);

  const startIndex = useCallback(async () => {
    if (indexing || !root) return;
    setIndexing(true);
    setProgress({ scanned: 0, indexed: 0, skipped: 0 });
    try {
      await window.afe.startIndex();
    } catch (err) {
      console.error(err);
      setIndexing(false);
    }
  }, [indexing, root]);

  const navigateTo = useCallback(
    (p: string) => {
      if (!currentPath || p === currentPath) return;
      setHistoryBack((h) => [...h, currentPath]);
      setHistoryForward([]);
      setCurrentPath(p);
      setFilter('');
      setSelected(null);
    },
    [currentPath]
  );

  const goBack = useCallback(() => {
    setHistoryBack((back) => {
      if (back.length === 0 || !currentPath) return back;
      const prev = back[back.length - 1]!;
      setHistoryForward((f) => [currentPath, ...f]);
      setCurrentPath(prev);
      setFilter('');
      setSelected(null);
      return back.slice(0, -1);
    });
  }, [currentPath]);

  const goForward = useCallback(() => {
    setHistoryForward((fwd) => {
      if (fwd.length === 0 || !currentPath) return fwd;
      const next = fwd[0]!;
      setHistoryBack((b) => [...b, currentPath]);
      setCurrentPath(next);
      setFilter('');
      setSelected(null);
      return fwd.slice(1);
    });
  }, [currentPath]);

  const goUp = useCallback(async () => {
    if (!currentPath) return;
    const parent = await window.afe.parentDir(currentPath);
    if (parent && parent !== currentPath) navigateTo(parent);
  }, [currentPath, navigateTo]);

  const onOpen = useCallback(
    (node: FileNode) => {
      if (node.isDir) navigateTo(node.path);
      else {
        setSelected(node.path);
        setPreviewOpen(true);
      }
    },
    [navigateTo]
  );

  const refresh = useCallback(() => setRefreshKey((n) => n + 1), []);

  const doNewFolder = useCallback(async () => {
    if (!currentPath) return;
    try {
      const p = await window.afe.newFolder(currentPath, 'New Folder');
      refresh();
      setSelected(p);
      setRenamingPath(p);
    } catch (err) {
      flashToast('err', `New folder failed: ${(err as Error).message}`);
    }
  }, [currentPath, refresh, flashToast]);

  const doNewFile = useCallback(async () => {
    if (!currentPath) return;
    try {
      const p = await window.afe.newFile(currentPath, 'New File.txt');
      refresh();
      setSelected(p);
      setRenamingPath(p);
    } catch (err) {
      flashToast('err', `New file failed: ${(err as Error).message}`);
    }
  }, [currentPath, refresh, flashToast]);

  const doRenameStart = useCallback((p: string) => {
    setSelected(p);
    setRenamingPath(p);
  }, []);

  const doRenameCommit = useCallback(
    async (oldPath: string, newName: string) => {
      setRenamingPath(null);
      try {
        const next = await window.afe.rename(oldPath, newName);
        setSelected(next);
        refresh();
      } catch (err) {
        flashToast('err', `Rename failed: ${(err as Error).message}`);
      }
    },
    [refresh, flashToast]
  );

  const doDelete = useCallback(
    async (paths: string[]) => {
      if (paths.length === 0) return;
      try {
        const res = await window.afe.trash(paths);
        const failures = res.filter((r) => !r.ok);
        if (failures.length > 0) {
          flashToast('err', `Delete failed for ${failures.length}/${paths.length} item(s)`);
        } else {
          flashToast('ok', `Moved ${paths.length} item(s) to trash`);
        }
        if (selected && paths.includes(selected)) setSelected(null);
        refresh();
      } catch (err) {
        flashToast('err', `Delete failed: ${(err as Error).message}`);
      }
    },
    [selected, refresh, flashToast]
  );

  const doCopy = useCallback((paths: string[]) => {
    if (paths.length === 0) return;
    setClipboard({ mode: 'copy', paths });
    flashToast('ok', `Copied ${paths.length} item(s)`);
  }, [flashToast]);

  const doCut = useCallback((paths: string[]) => {
    if (paths.length === 0) return;
    setClipboard({ mode: 'cut', paths });
    flashToast('ok', `Cut ${paths.length} item(s)`);
  }, [flashToast]);

  const doPaste = useCallback(async () => {
    if (!clipboard || !currentPath) return;
    try {
      if (clipboard.mode === 'copy') {
        const out = await window.afe.copyPaths(clipboard.paths, currentPath);
        flashToast('ok', `Pasted ${out.length} item(s)`);
      } else {
        const out = await window.afe.movePaths(clipboard.paths, currentPath);
        flashToast('ok', `Moved ${out.length} item(s)`);
        setClipboard(null);
      }
      refresh();
    } catch (err) {
      flashToast('err', `Paste failed: ${(err as Error).message}`);
    }
  }, [clipboard, currentPath, refresh, flashToast]);

  const onContextMenuRow = useCallback(
    (e: React.MouseEvent, node: FileNode) => {
      e.preventDefault();
      e.stopPropagation();
      setSelected(node.path);
      const items: MenuItem[] = [
        { label: 'Open', onClick: () => onOpen(node), shortcut: 'Enter' },
        { label: 'Reveal in OS', onClick: () => window.afe.revealInOS(node.path) },
        { separator: true, label: '' },
        { label: 'Cut', shortcut: 'Ctrl+X', onClick: () => doCut([node.path]) },
        { label: 'Copy', shortcut: 'Ctrl+C', onClick: () => doCopy([node.path]) },
        {
          label: 'Paste',
          shortcut: 'Ctrl+V',
          onClick: () => void doPaste(),
          disabled: !clipboard,
        },
        { separator: true, label: '' },
        { label: 'Rename', shortcut: 'F2', onClick: () => doRenameStart(node.path) },
        { label: 'Delete', shortcut: 'Del', onClick: () => void doDelete([node.path]) },
      ];
      setMenu({ x: e.clientX, y: e.clientY, items });
    },
    [onOpen, doCut, doCopy, doPaste, doRenameStart, doDelete, clipboard]
  );

  const onContextMenuEmpty = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const items: MenuItem[] = [
        { label: 'New folder', shortcut: 'Ctrl+Shift+N', onClick: () => void doNewFolder() },
        { label: 'New file', shortcut: 'Ctrl+N', onClick: () => void doNewFile() },
        { separator: true, label: '' },
        {
          label: 'Paste',
          shortcut: 'Ctrl+V',
          onClick: () => void doPaste(),
          disabled: !clipboard,
        },
        { separator: true, label: '' },
        { label: 'Refresh', shortcut: 'F5', onClick: refresh },
      ];
      setMenu({ x: e.clientX, y: e.clientY, items });
    },
    [doNewFolder, doNewFile, doPaste, clipboard, refresh]
  );

  const onDragOverRoot = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer?.types?.includes('Files')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      setDropActive(true);
    }
  }, []);
  const onDragLeaveRoot = useCallback((e: React.DragEvent) => {
    if (e.currentTarget === e.target) setDropActive(false);
  }, []);
  const onDropRoot = useCallback(
    async (e: React.DragEvent) => {
      setDropActive(false);
      if (!currentPath) return;
      const files = Array.from(e.dataTransfer.files ?? []);
      if (files.length === 0) return;
      e.preventDefault();
      const paths = files
        .map((f) => (f as File & { path?: string }).path ?? '')
        .filter((p) => p && p !== currentPath);
      if (paths.length === 0) return;
      try {
        await window.afe.copyPaths(paths, currentPath);
        flashToast('ok', `Imported ${paths.length} item(s)`);
        refresh();
      } catch (err) {
        flashToast('err', `Drop failed: ${(err as Error).message}`);
      }
    },
    [currentPath, refresh, flashToast]
  );

  const progressPct = useMemo(() => {
    if (!progress || progress.scanned === 0) return 4;
    return Math.min(100, ((progress.indexed + progress.skipped) / progress.scanned) * 100);
  }, [progress]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (section !== 'explorer') return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      const isEditable =
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        target?.isContentEditable === true;

      if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        goBack();
        return;
      }
      if (e.altKey && e.key === 'ArrowRight') {
        e.preventDefault();
        goForward();
        return;
      }
      if (e.altKey && e.key === 'ArrowUp') {
        e.preventDefault();
        void goUp();
        return;
      }
      if (e.key === 'F5') {
        e.preventDefault();
        setRefreshKey((n) => n + 1);
        return;
      }
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.shiftKey && (e.key === 'N' || e.key === 'n')) {
        e.preventDefault();
        void doNewFolder();
        return;
      }
      if (ctrl && !e.shiftKey && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault();
        void doNewFile();
        return;
      }
      if (ctrl && (e.key === 'c' || e.key === 'C') && !isEditable) {
        e.preventDefault();
        if (selected) doCopy([selected]);
        return;
      }
      if (ctrl && (e.key === 'x' || e.key === 'X') && !isEditable) {
        e.preventDefault();
        if (selected) doCut([selected]);
        return;
      }
      if (ctrl && (e.key === 'v' || e.key === 'V') && !isEditable) {
        e.preventDefault();
        void doPaste();
        return;
      }
      if (!isEditable && e.key === 'F2') {
        e.preventDefault();
        if (selected) doRenameStart(selected);
        return;
      }
      if (!isEditable && (e.key === 'Delete' || e.key === 'Del')) {
        e.preventDefault();
        if (selected) void doDelete([selected]);
        return;
      }
      if (!isEditable && e.key === 'Backspace') {
        e.preventDefault();
        void goUp();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [section, goBack, goForward, goUp, selected, doNewFolder, doNewFile, doCopy, doCut, doPaste, doRenameStart, doDelete]);

  return (
    <div className="app">
      <div className="topbar">
        <div className="brand">
          <div className="dot" />
          AI File Explorer
        </div>
        <button onClick={chooseFolder}>Open folder…</button>
        <button className="primary" onClick={startIndex} disabled={!root || indexing}>
          {indexing ? <><span className="spinner" /> Indexing…</> : 'Index folder'}
        </button>
        {indexing && progress && (
          <div className="topbar-progress-text" title={progress.currentPath ?? ''}>
            {progress.indexed + progress.skipped}/{progress.scanned}
          </div>
        )}
        <div className="topbar-spacer" />
        <div className="provider">{provider}</div>
      </div>
      {indexing && (
        <div className="progress-bar">
          <div className="fill" style={{ width: `${progressPct}%` }} />
        </div>
      )}
      <div className="shell">
        <NavRail
          section={section}
          onChange={setSection}
          aiPanelOpen={aiPanelOpen}
          onToggleAI={() => setAIPanelOpen((v) => !v)}
        />
        <div className="workspace">
          {section === 'explorer' && (
            <>
              {root && currentPath ? (
                <div className="explorer-with-places">
                  <PlacesSidebar
                    root={root}
                    favorites={favorites}
                    recent={recent}
                    currentPath={currentPath}
                    onNavigate={navigateTo}
                    onRemoveFavorite={removeFavorite}
                    onClearRecent={clearRecent}
                  />
                  <div className="explorer-main">
                  <AddressBar
                    root={root}
                    currentPath={currentPath}
                    canBack={historyBack.length > 0}
                    canForward={historyForward.length > 0}
                    onBack={goBack}
                    onForward={goForward}
                    onUp={goUp}
                    onNavigate={navigateTo}
                    isFavorite={favorites.includes(currentPath)}
                    onToggleFavorite={toggleFavorite}
                  />
                  <div className="explorer-toolbar">
                    <div className="view-toggle">
                      {(['list', 'grid', 'gallery'] as ViewMode[]).map((m) => (
                        <button
                          key={m}
                          className={`seg${viewMode === m ? ' active' : ''}`}
                          onClick={() => setViewMode(m)}
                          title={m[0]!.toUpperCase() + m.slice(1)}
                        >
                          {m === 'list' ? '☰' : m === 'grid' ? '⊞' : '▣'}
                        </button>
                      ))}
                    </div>
                    <div className="op-group" role="group" aria-label="File operations">
                      <button className="seg" onClick={() => void doNewFolder()} title="New folder (Ctrl+Shift+N)">➕ Folder</button>
                      <button className="seg" onClick={() => void doNewFile()} title="New file (Ctrl+N)">➕ File</button>
                      <button className="seg" onClick={() => selected && doRenameStart(selected)} disabled={!selected} title="Rename (F2)">✏️ Rename</button>
                      <button className="seg danger" onClick={() => selected && void doDelete([selected])} disabled={!selected} title="Delete (Del)">🗑 Delete</button>
                      <button className="seg" onClick={() => selected && doCut([selected])} disabled={!selected} title="Cut (Ctrl+X)">✂ Cut</button>
                      <button className="seg" onClick={() => selected && doCopy([selected])} disabled={!selected} title="Copy (Ctrl+C)">⧉ Copy</button>
                      <button className="seg" onClick={() => void doPaste()} disabled={!clipboard} title="Paste (Ctrl+V)">📋 Paste</button>
                    </div>
                    <input
                      className="filter-input"
                      placeholder="Filter…"
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                    />
                    <div className="toolbar-spacer" />
                    <button
                      className="seg"
                      onClick={() => setRefreshKey((n) => n + 1)}
                      title="Refresh (F5)"
                    >
                      ⟳
                    </button>
                    <button
                      className={`seg${showHidden ? ' active' : ''}`}
                      onClick={toggleHidden}
                      title="Show hidden files (dotfiles)"
                    >
                      👁‍🗨 Hidden
                    </button>
                    <button
                      className={`seg${splitOn ? ' active' : ''}`}
                      onClick={() => {
                        if (!splitOn) {
                          setSecondaryPath(currentPath);
                          setSplitKey((n) => n + 1);
                          setSplitOn(true);
                        } else {
                          setSplitOn(false);
                        }
                      }}
                      title="Toggle split view"
                    >
                      ⇿ Split
                    </button>
                    <button
                      className={`seg${previewOpen ? ' active' : ''}`}
                      onClick={() => setPreviewOpen((v) => !v)}
                      title="Toggle preview"
                    >
                      👁 Preview
                    </button>
                  </div>
                  <div className={`explorer-body${previewOpen ? ' with-preview' : ''}${splitOn ? ' with-split' : ''}`}>
                    <div
                      className={`file-list-pane${dropActive ? ' drop-active' : ''}`}
                      onDragOver={onDragOverRoot}
                      onDragLeave={onDragLeaveRoot}
                      onDrop={onDropRoot}
                    >
                      <FileList
                        path={currentPath}
                        selected={selected}
                        onSelect={setSelected}
                        onOpen={onOpen}
                        viewMode={viewMode}
                        sortKey={sortKey}
                        sortDir={sortDir}
                        onSortChange={(k, d) => {
                          setSortKey(k);
                          setSortDir(d);
                        }}
                        filter={filter}
                        refreshKey={refreshKey}
                        renamingPath={renamingPath}
                        onCommitRename={doRenameCommit}
                        onCancelRename={() => setRenamingPath(null)}
                        onContextMenuRow={onContextMenuRow}
                        onContextMenuEmpty={onContextMenuEmpty}
                        cutPaths={cutPaths}
                      />
                    </div>
                    {splitOn && secondaryPath && (
                      <SecondaryPane
                        key={splitKey}
                        root={root}
                        initialPath={secondaryPath}
                        viewMode={viewMode}
                        showHidden={showHidden}
                        onClose={() => setSplitOn(false)}
                        onSwap={(secCurrent) => {
                          setSecondaryPath(currentPath);
                          setSplitKey((n) => n + 1);
                          navigateTo(secCurrent);
                        }}
                      />
                    )}
                    {previewOpen && (
                      <div className="preview-pane">
                        <div className="pane-header">
                          {selected ? basename(selected) : 'Preview'}
                        </div>
                        <div className="pane-body">
                          {selected ? (
                            <FilePreview path={selected} />
                          ) : (
                            <div className="placeholder">Select a file to preview its contents.</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  </div>
                </div>
              ) : (
                <div className="placeholder big-placeholder">
                  <div className="emoji">📁</div>
                  <div>Click "Open folder…" to pick a folder to explore.</div>
                </div>
              )}
            </>
          )}
          {section === 'settings' && uiSettings && (
            <SettingsPage
              settings={uiSettings}
              onChange={updateUi}
              onExport={exportUi}
              onImport={importUi}
              onReset={resetUi}
            />
          )}
        </div>
        {aiPanelOpen && (
          <div className="ai-pane">
            <AIPanel selected={selected} root={root} />
          </div>
        )}
      </div>
      {menu && <ContextMenu x={menu.x} y={menu.y} items={menu.items} onClose={() => setMenu(null)} />}
      {toast && (
        <div className={`toast toast-${toast.kind}`} role="status">
          {toast.text}
        </div>
      )}
    </div>
  );
}

function ComingSoon({ title, hint }: { title: string; hint: string }): JSX.Element {
  return (
    <div className="placeholder big-placeholder">
      <div className="emoji">🛠</div>
      <div className="big">{title}</div>
      <div className="dim">{hint}</div>
    </div>
  );
}

function basename(p: string): string {
  const parts = p.split(/[/\\]/).filter(Boolean);
  return parts[parts.length - 1] ?? p;
}

function hexWithAlpha(hex: string, alpha: number): string {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1]!, 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
