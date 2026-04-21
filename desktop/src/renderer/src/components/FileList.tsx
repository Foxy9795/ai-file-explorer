import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FileNode } from '../../../preload/types';
import type { SortDir, SortKey, ViewMode } from '../types';

interface Props {
  path: string;
  selected: string | null;
  onSelect: (p: string) => void;
  onOpen: (node: FileNode) => void;
  viewMode: ViewMode;
  sortKey: SortKey;
  sortDir: SortDir;
  onSortChange: (k: SortKey, d: SortDir) => void;
  filter: string;
  refreshKey?: number;
  renamingPath: string | null;
  onCommitRename: (oldPath: string, newName: string) => void;
  onCancelRename: () => void;
  onContextMenuRow: (e: React.MouseEvent, node: FileNode) => void;
  onContextMenuEmpty: (e: React.MouseEvent) => void;
  cutPaths: Set<string>;
}

export function FileList({
  path,
  selected,
  onSelect,
  onOpen,
  viewMode,
  sortKey,
  sortDir,
  onSortChange,
  filter,
  refreshKey,
  renamingPath,
  onCommitRename,
  onCancelRename,
  onContextMenuRow,
  onContextMenuEmpty,
  cutPaths,
}: Props): JSX.Element {
  const [entries, setEntries] = useState<FileNode[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setEntries(null);
    setError(null);
    window.afe
      .listDir(path)
      .then((c) => {
        if (alive) setEntries(c);
      })
      .catch((err: Error) => {
        if (alive) setError(err.message);
      });
    return () => {
      alive = false;
    };
  }, [path, refreshKey]);

  const containerRef = useRef<HTMLDivElement | null>(null);

  const shown = useMemo(() => {
    if (!entries) return [];
    let list = entries;
    if (filter.trim()) {
      const needle = filter.toLowerCase();
      list = list.filter((e) => e.name.toLowerCase().includes(needle));
    }
    const sorted = [...list].sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
      let cmp = 0;
      switch (sortKey) {
        case 'name':
          cmp = a.name.localeCompare(b.name);
          break;
        case 'size':
          cmp = (a.size ?? 0) - (b.size ?? 0);
          break;
        case 'type':
          cmp = extOf(a).localeCompare(extOf(b));
          if (cmp === 0) cmp = a.name.localeCompare(b.name);
          break;
        case 'mtime':
          cmp = (a.mtime ?? 0) - (b.mtime ?? 0);
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [entries, filter, sortKey, sortDir]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (shown.length === 0) return;
      const idx = selected ? shown.findIndex((e) => e.path === selected) : -1;
      let next = idx;
      if (e.key === 'ArrowDown') next = Math.min(shown.length - 1, idx + 1);
      else if (e.key === 'ArrowUp') next = Math.max(0, idx === -1 ? 0 : idx - 1);
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = shown.length - 1;
      else if (e.key === 'Enter') {
        if (idx >= 0) {
          e.preventDefault();
          onOpen(shown[idx]!);
        }
        return;
      } else {
        return;
      }
      if (next !== idx && next >= 0) {
        e.preventDefault();
        onSelect(shown[next]!.path);
      }
    },
    [shown, selected, onSelect, onOpen]
  );

  useEffect(() => {
    if (!selected) return;
    const root = containerRef.current;
    if (!root) return;
    const el = root.querySelector(`[data-fpath="${CSS.escape(selected)}"]`) as HTMLElement | null;
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  }, [selected]);

  useEffect(() => {
    if (entries && entries.length > 0 && !renamingPath) {
      containerRef.current?.focus({ preventScroll: true });
    }
  }, [entries, renamingPath]);

  if (error) return <div className="placeholder err">Cannot read folder: {error}</div>;
  if (entries === null) return <div className="placeholder">Loading…</div>;
  if (shown.length === 0) {
    return (
      <div className="placeholder">
        {filter ? `No items match "${filter}".` : 'This folder is empty.'}
      </div>
    );
  }

  const common = {
    selected,
    onSelect,
    onOpen,
    renamingPath,
    onCommitRename,
    onCancelRename,
    onContextMenuRow,
    cutPaths,
  };

  let inner: JSX.Element;
  if (viewMode === 'list') {
    inner = (
      <ListView
        entries={shown}
        {...common}
        sortKey={sortKey}
        sortDir={sortDir}
        onSortChange={onSortChange}
      />
    );
  } else if (viewMode === 'grid') {
    inner = <GridView entries={shown} {...common} />;
  } else {
    inner = <GalleryView entries={shown} {...common} />;
  }

  return (
    <div
      ref={containerRef}
      className="file-list-root"
      tabIndex={0}
      onKeyDown={onKeyDown}
      onContextMenu={(e) => {
        if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('file-list-body') || (e.target as HTMLElement).classList.contains('file-grid') || (e.target as HTMLElement).classList.contains('file-gallery') || (e.target as HTMLElement).classList.contains('file-list-root')) {
          onContextMenuEmpty(e);
        }
      }}
    >
      {inner}
    </div>
  );
}

interface RowCommon {
  selected: string | null;
  onSelect: (p: string) => void;
  onOpen: (n: FileNode) => void;
  renamingPath: string | null;
  onCommitRename: (oldPath: string, newName: string) => void;
  onCancelRename: () => void;
  onContextMenuRow: (e: React.MouseEvent, n: FileNode) => void;
  cutPaths: Set<string>;
}

function RenameInput({
  initial,
  isDir,
  onCommit,
  onCancel,
}: {
  initial: string;
  isDir: boolean;
  onCommit: (v: string) => void;
  onCancel: () => void;
}): JSX.Element {
  const [v, setV] = useState(initial);
  const ref = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    const dot = initial.lastIndexOf('.');
    if (!isDir && dot > 0) el.setSelectionRange(0, dot);
    else el.select();
  }, [initial, isDir]);
  return (
    <input
      ref={ref}
      className="rename-input"
      value={v}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => {
        const trimmed = v.trim();
        if (!trimmed || trimmed === initial) onCancel();
        else onCommit(trimmed);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const trimmed = v.trim();
          if (!trimmed || trimmed === initial) onCancel();
          else onCommit(trimmed);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          onCancel();
        }
        e.stopPropagation();
      }}
    />
  );
}

interface ViewProps extends RowCommon {
  entries: FileNode[];
}

function ListView({
  entries,
  selected,
  onSelect,
  onOpen,
  sortKey,
  sortDir,
  onSortChange,
  renamingPath,
  onCommitRename,
  onCancelRename,
  onContextMenuRow,
  cutPaths,
}: ViewProps & {
  sortKey: SortKey;
  sortDir: SortDir;
  onSortChange: (k: SortKey, d: SortDir) => void;
}): JSX.Element {
  const clickHeader = (k: SortKey) => {
    if (k === sortKey) onSortChange(k, sortDir === 'asc' ? 'desc' : 'asc');
    else onSortChange(k, k === 'mtime' || k === 'size' ? 'desc' : 'asc');
  };
  const arrow = (k: SortKey) => (sortKey === k ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '');
  return (
    <div className="file-list">
      <div className="file-list-header">
        <div className="col col-name" onClick={() => clickHeader('name')}>Name{arrow('name')}</div>
        <div className="col col-size" onClick={() => clickHeader('size')}>Size{arrow('size')}</div>
        <div className="col col-type" onClick={() => clickHeader('type')}>Type{arrow('type')}</div>
        <div className="col col-mtime" onClick={() => clickHeader('mtime')}>Modified{arrow('mtime')}</div>
      </div>
      <div className="file-list-body">
        {entries.map((e) => (
          <div
            key={e.path}
            data-fpath={e.path}
            className={`file-row${selected === e.path ? ' selected' : ''}${cutPaths.has(e.path) ? ' cut' : ''}`}
            onClick={() => onSelect(e.path)}
            onDoubleClick={() => onOpen(e)}
            onContextMenu={(ev) => onContextMenuRow(ev, e)}
            title={e.path}
          >
            <div className="col col-name">
              <span className="row-icon">{iconFor(e)}</span>
              {renamingPath === e.path ? (
                <RenameInput
                  initial={e.name}
                  isDir={e.isDir}
                  onCommit={(v) => onCommitRename(e.path, v)}
                  onCancel={onCancelRename}
                />
              ) : (
                <span className="row-name">{e.name}</span>
              )}
            </div>
            <div className="col col-size">{e.isDir ? '—' : formatSize(e.size)}</div>
            <div className="col col-type">{typeOf(e)}</div>
            <div className="col col-mtime">{formatTime(e.mtime)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function GridView({
  entries,
  selected,
  onSelect,
  onOpen,
  renamingPath,
  onCommitRename,
  onCancelRename,
  onContextMenuRow,
  cutPaths,
}: ViewProps): JSX.Element {
  return (
    <div className="file-grid">
      {entries.map((e) => (
        <div
          key={e.path}
          data-fpath={e.path}
          className={`grid-cell${selected === e.path ? ' selected' : ''}${cutPaths.has(e.path) ? ' cut' : ''}`}
          onClick={() => onSelect(e.path)}
          onDoubleClick={() => onOpen(e)}
          onContextMenu={(ev) => onContextMenuRow(ev, e)}
          title={e.path}
        >
          <div className="grid-icon">{iconFor(e)}</div>
          {renamingPath === e.path ? (
            <RenameInput
              initial={e.name}
              isDir={e.isDir}
              onCommit={(v) => onCommitRename(e.path, v)}
              onCancel={onCancelRename}
            />
          ) : (
            <div className="grid-name">{e.name}</div>
          )}
        </div>
      ))}
    </div>
  );
}

function GalleryView({
  entries,
  selected,
  onSelect,
  onOpen,
  renamingPath,
  onCommitRename,
  onCancelRename,
  onContextMenuRow,
  cutPaths,
}: ViewProps): JSX.Element {
  return (
    <div className="file-gallery">
      {entries.map((e) => (
        <div
          key={e.path}
          data-fpath={e.path}
          className={`gallery-cell${selected === e.path ? ' selected' : ''}${cutPaths.has(e.path) ? ' cut' : ''}`}
          onClick={() => onSelect(e.path)}
          onDoubleClick={() => onOpen(e)}
          onContextMenu={(ev) => onContextMenuRow(ev, e)}
          title={e.path}
        >
          <div className="gallery-thumb">
            {isImage(e) ? (
              <img src={`file://${e.path}`} alt={e.name} />
            ) : (
              <div className="gallery-icon">{iconFor(e)}</div>
            )}
          </div>
          {renamingPath === e.path ? (
            <RenameInput
              initial={e.name}
              isDir={e.isDir}
              onCommit={(v) => onCommitRename(e.path, v)}
              onCancel={onCancelRename}
            />
          ) : (
            <div className="gallery-name">{e.name}</div>
          )}
        </div>
      ))}
    </div>
  );
}

function iconFor(e: FileNode): string {
  if (e.isDir) return '📁';
  const ext = extOf(e);
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'].includes(ext)) return '🖼';
  if (['mp4', 'mov', 'avi', 'webm', 'mkv'].includes(ext)) return '🎬';
  if (['mp3', 'wav', 'flac', 'ogg', 'm4a'].includes(ext)) return '🎵';
  if (['pdf'].includes(ext)) return '📕';
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return '🗄';
  if (['md', 'txt', 'rtf'].includes(ext)) return '📄';
  if (['js', 'ts', 'tsx', 'jsx', 'py', 'rs', 'go', 'java', 'c', 'cpp', 'h', 'cs', 'rb', 'php', 'sh', 'json', 'yml', 'yaml', 'toml', 'html', 'css', 'scss'].includes(ext)) return '📝';
  return '📄';
}

function isImage(e: FileNode): boolean {
  if (e.isDir) return false;
  const ext = extOf(e);
  return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'].includes(ext);
}

function extOf(e: FileNode): string {
  const i = e.name.lastIndexOf('.');
  if (i <= 0) return '';
  return e.name.slice(i + 1).toLowerCase();
}

function typeOf(e: FileNode): string {
  if (e.isDir) return 'Folder';
  const ext = extOf(e);
  return ext ? ext.toUpperCase() : 'File';
}

function formatSize(b: number | undefined): string {
  if (b == null) return '—';
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 * 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(1)} MB`;
  return `${(b / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatTime(ms: number | undefined): string {
  if (ms == null) return '—';
  const d = new Date(ms);
  const now = new Date();
  const sameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleString(undefined, {
    month: 'short',
    day: '2-digit',
    year: sameYear ? undefined : 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
