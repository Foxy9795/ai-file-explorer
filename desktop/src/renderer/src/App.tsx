import { useCallback, useEffect, useState } from 'react';
import { FileTree } from './components/FileTree';
import { AIPanel } from './components/AIPanel';
import { FilePreview } from './components/FilePreview';

export function App(): JSX.Element {
  const [root, setRoot] = useState<string | null>(null);
  const [provider, setProvider] = useState<string>('');
  const [selected, setSelected] = useState<string | null>(null);
  const [indexing, setIndexing] = useState(false);
  const [progress, setProgress] = useState<{ scanned: number; indexed: number; skipped: number; currentPath?: string } | null>(null);
  const [indexBump, setIndexBump] = useState(0);

  useEffect(() => {
    (async () => {
      const r = await window.afe.getRoot();
      setRoot(r);
      const p = await window.afe.providerName();
      setProvider(p);
    })();
  }, []);

  useEffect(() => {
    return window.afe.onIndexProgress((p) => {
      setProgress({ scanned: p.scanned, indexed: p.indexed, skipped: p.skipped, currentPath: p.currentPath });
      if (p.done) {
        setIndexing(false);
        setIndexBump((n) => n + 1);
      }
    });
  }, []);

  const chooseFolder = useCallback(async () => {
    const r = await window.afe.chooseFolder();
    if (r) {
      setRoot(r);
      setSelected(null);
      setProgress(null);
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
        <div className="root-label" title={root ?? ''}>
          {root ?? 'No folder selected'}
        </div>
        <div className="provider">{provider}</div>
      </div>
      {indexing && (
        <div className="progress-bar">
          <div
            className="fill"
            style={{
              width: progress && progress.scanned > 0
                ? `${Math.min(100, ((progress.indexed + progress.skipped) / progress.scanned) * 100)}%`
                : '4%',
            }}
          />
        </div>
      )}
      <div className="main">
        <div className="pane">
          <div className="pane-header">Files</div>
          <div className="pane-body">
            {root ? (
              <FileTree
                root={root}
                selected={selected}
                onSelect={(p) => setSelected(p)}
                indexBump={indexBump}
              />
            ) : (
              <div className="placeholder">
                <div className="big">📁</div>
                <div>Click “Open folder…” to pick a folder to explore.</div>
              </div>
            )}
          </div>
        </div>
        <div className="pane">
          <div className="pane-header">
            {selected ? selected : 'Preview'}
          </div>
          <div className="pane-body">
            {selected ? (
              <FilePreview path={selected} />
            ) : (
              <div className="placeholder">Select a file to preview its contents.</div>
            )}
          </div>
        </div>
        <div className="pane">
          <AIPanel selected={selected} root={root} />
        </div>
      </div>
    </div>
  );
}
