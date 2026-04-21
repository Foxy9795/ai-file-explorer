import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FileNode } from '../../../preload/types';
import type { SortDir, SortKey, ViewMode } from '../types';
import { AddressBar } from './AddressBar';
import { FileList } from './FileList';

interface Props {
  root: string;
  initialPath: string;
  viewMode: ViewMode;
  showHidden: boolean;
  onClose: () => void;
  onSwap: () => void;
}

export function SecondaryPane({
  root,
  initialPath,
  viewMode,
  onClose,
  onSwap,
}: Props): JSX.Element {
  const [path, setPath] = useState(initialPath);
  const [back, setBack] = useState<string[]>([]);
  const [forward, setForward] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setPath(initialPath);
    setBack([]);
    setForward([]);
    setSelected(null);
  }, [initialPath]);

  const navigateTo = useCallback(
    (p: string) => {
      if (p === path) return;
      setBack((h) => [...h, path]);
      setForward([]);
      setPath(p);
      setFilter('');
      setSelected(null);
    },
    [path]
  );

  const goBack = useCallback(() => {
    setBack((h) => {
      if (h.length === 0) return h;
      const prev = h[h.length - 1]!;
      setForward((f) => [path, ...f]);
      setPath(prev);
      setFilter('');
      setSelected(null);
      return h.slice(0, -1);
    });
  }, [path]);

  const goForward = useCallback(() => {
    setForward((f) => {
      if (f.length === 0) return f;
      const nxt = f[0]!;
      setBack((h) => [...h, path]);
      setPath(nxt);
      setFilter('');
      setSelected(null);
      return f.slice(1);
    });
  }, [path]);

  const goUp = useCallback(async () => {
    const parent = await window.afe.parentDir(path);
    if (parent && parent !== path) navigateTo(parent);
  }, [path, navigateTo]);

  const onOpen = useCallback(
    (node: FileNode) => {
      if (node.isDir) navigateTo(node.path);
      else setSelected(node.path);
    },
    [navigateTo]
  );

  const noop = useMemo(() => () => undefined, []);
  const noopMouse = useMemo(() => (e: React.MouseEvent) => e.preventDefault(), []);

  return (
    <div className="file-list-pane secondary-pane">
      <div className="secondary-pane-bar">
        <AddressBar
          root={root}
          currentPath={path}
          canBack={back.length > 0}
          canForward={forward.length > 0}
          onBack={goBack}
          onForward={goForward}
          onUp={goUp}
          onNavigate={navigateTo}
        />
        <button className="icon-btn" onClick={onSwap} title="Swap panes">
          ⇄
        </button>
        <button className="icon-btn" onClick={onClose} title="Close split">
          ×
        </button>
      </div>
      <div className="secondary-pane-toolbar">
        <input
          className="filter-input"
          placeholder="Filter…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <button
          className="seg"
          onClick={() => setRefreshKey((n) => n + 1)}
          title="Refresh"
        >
          ⟳
        </button>
      </div>
      <FileList
        path={path}
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
        renamingPath={null}
        onCommitRename={noop}
        onCancelRename={noop}
        onContextMenuRow={noopMouse}
        onContextMenuEmpty={noopMouse}
        cutPaths={EMPTY_SET}
      />
    </div>
  );
}

const EMPTY_SET: Set<string> = new Set();
