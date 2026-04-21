import { useCallback, useEffect, useMemo, useState } from 'react';
import { AIPanel } from './components/AIPanel';
import { AddressBar } from './components/AddressBar';
import { FileList } from './components/FileList';
import { FilePreview } from './components/FilePreview';
import { NavRail } from './components/NavRail';
import type { FileNode } from '../../preload/types';
import type { Section, SortDir, SortKey, ViewMode } from './types';

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

  useEffect(() => {
    (async () => {
      const r = await window.afe.getRoot();
      setRoot(r);
      if (r) setCurrentPath(r);
      const p = await window.afe.providerName();
      setProvider(p);
      const sh = await window.afe.getShowHidden();
      setShowHidden(sh);
    })();
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
      if (!isEditable && e.key === 'Backspace') {
        e.preventDefault();
        void goUp();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [section, goBack, goForward, goUp]);

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

  const progressPct = useMemo(() => {
    if (!progress || progress.scanned === 0) return 4;
    return Math.min(100, ((progress.indexed + progress.skipped) / progress.scanned) * 100);
  }, [progress]);

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
                <>
                  <AddressBar
                    root={root}
                    currentPath={currentPath}
                    canBack={historyBack.length > 0}
                    canForward={historyForward.length > 0}
                    onBack={goBack}
                    onForward={goForward}
                    onUp={goUp}
                    onNavigate={navigateTo}
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
                      className={`seg${previewOpen ? ' active' : ''}`}
                      onClick={() => setPreviewOpen((v) => !v)}
                      title="Toggle preview"
                    >
                      👁 Preview
                    </button>
                  </div>
                  <div className={`explorer-body${previewOpen ? ' with-preview' : ''}`}>
                    <div className="file-list-pane">
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
                      />
                    </div>
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
                </>
              ) : (
                <div className="placeholder big-placeholder">
                  <div className="emoji">📁</div>
                  <div>Click "Open folder…" to pick a folder to explore.</div>
                </div>
              )}
            </>
          )}
          {section === 'favorites' && <ComingSoon title="Favorites" hint="Pin folders for quick access. Coming in A.4." />}
          {section === 'recent' && <ComingSoon title="Recent" hint="Jump back into recently visited folders. Coming in A.4." />}
          {section === 'settings' && <ComingSoon title="Settings" hint="Theme, provider config, JSON export/import. Coming in Phase F." />}
        </div>
        {aiPanelOpen && (
          <div className="ai-pane">
            <AIPanel selected={selected} root={root} />
          </div>
        )}
      </div>
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
