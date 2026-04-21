import { useEffect, useMemo, useState } from 'react';
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

  if (error) return <div className="placeholder err">Cannot read folder: {error}</div>;
  if (entries === null) return <div className="placeholder">Loading…</div>;
  if (shown.length === 0) {
    return (
      <div className="placeholder">
        {filter ? `No items match "${filter}".` : 'This folder is empty.'}
      </div>
    );
  }

  if (viewMode === 'list') {
    return (
      <ListView
        entries={shown}
        selected={selected}
        onSelect={onSelect}
        onOpen={onOpen}
        sortKey={sortKey}
        sortDir={sortDir}
        onSortChange={onSortChange}
      />
    );
  }
  if (viewMode === 'grid') {
    return <GridView entries={shown} selected={selected} onSelect={onSelect} onOpen={onOpen} />;
  }
  return <GalleryView entries={shown} selected={selected} onSelect={onSelect} onOpen={onOpen} />;
}

interface ViewProps {
  entries: FileNode[];
  selected: string | null;
  onSelect: (p: string) => void;
  onOpen: (n: FileNode) => void;
}

function ListView({
  entries,
  selected,
  onSelect,
  onOpen,
  sortKey,
  sortDir,
  onSortChange,
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
            className={`file-row${selected === e.path ? ' selected' : ''}`}
            onClick={() => onSelect(e.path)}
            onDoubleClick={() => onOpen(e)}
            title={e.path}
          >
            <div className="col col-name">
              <span className="row-icon">{iconFor(e)}</span>
              <span className="row-name">{e.name}</span>
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

function GridView({ entries, selected, onSelect, onOpen }: ViewProps): JSX.Element {
  return (
    <div className="file-grid">
      {entries.map((e) => (
        <div
          key={e.path}
          className={`grid-cell${selected === e.path ? ' selected' : ''}`}
          onClick={() => onSelect(e.path)}
          onDoubleClick={() => onOpen(e)}
          title={e.path}
        >
          <div className="grid-icon">{iconFor(e)}</div>
          <div className="grid-name">{e.name}</div>
        </div>
      ))}
    </div>
  );
}

function GalleryView({ entries, selected, onSelect, onOpen }: ViewProps): JSX.Element {
  return (
    <div className="file-gallery">
      {entries.map((e) => (
        <div
          key={e.path}
          className={`gallery-cell${selected === e.path ? ' selected' : ''}`}
          onClick={() => onSelect(e.path)}
          onDoubleClick={() => onOpen(e)}
          title={e.path}
        >
          <div className="gallery-thumb">
            {isImage(e) ? (
              <img src={`file://${e.path}`} alt={e.name} />
            ) : (
              <div className="gallery-icon">{iconFor(e)}</div>
            )}
          </div>
          <div className="gallery-name">{e.name}</div>
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
