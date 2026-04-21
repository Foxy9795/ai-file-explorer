import { useEffect, useMemo, useRef, useState } from 'react';

interface Props {
  root: string;
  currentPath: string;
  canBack: boolean;
  canForward: boolean;
  onBack: () => void;
  onForward: () => void;
  onUp: () => void;
  onNavigate: (path: string) => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}

export function AddressBar({
  root,
  currentPath,
  canBack,
  canForward,
  onBack,
  onForward,
  onUp,
  onNavigate,
  isFavorite,
  onToggleFavorite,
}: Props): JSX.Element {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(currentPath);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!editing) setDraft(currentPath);
  }, [currentPath, editing]);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const segments = useMemo(() => toBreadcrumbs(root, currentPath), [root, currentPath]);

  const commit = (raw: string) => {
    const v = raw.trim();
    setEditing(false);
    if (v && v !== currentPath) onNavigate(v);
  };

  return (
    <div className="address-bar">
      <button className="icon-btn" disabled={!canBack} onClick={onBack} title="Back">
        ←
      </button>
      <button className="icon-btn" disabled={!canForward} onClick={onForward} title="Forward">
        →
      </button>
      <button className="icon-btn" onClick={onUp} title="Up">
        ↑
      </button>
      {onToggleFavorite && (
        <button
          className={`icon-btn fav-toggle${isFavorite ? ' on' : ''}`}
          onClick={onToggleFavorite}
          title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          {isFavorite ? '★' : '☆'}
        </button>
      )}
      <div className="address-box" onClick={() => !editing && setEditing(true)}>
        {editing ? (
          <input
            ref={inputRef}
            className="address-input"
            value={draft}
            autoFocus
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => commit(draft)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit(draft);
              else if (e.key === 'Escape') {
                setDraft(currentPath);
                setEditing(false);
              }
            }}
          />
        ) : (
          <div className="breadcrumbs">
            {segments.map((seg, i) => (
              <span
                key={seg.path}
                className="crumb"
                onClick={(e) => {
                  e.stopPropagation();
                  if (seg.path !== currentPath) onNavigate(seg.path);
                }}
                title={seg.path}
              >
                {i === 0 && seg.isRoot ? <span className="crumb-icon">🏠</span> : null}
                <span className="crumb-label">{seg.label}</span>
                {i < segments.length - 1 ? <span className="crumb-sep">›</span> : null}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface Crumb {
  label: string;
  path: string;
  isRoot?: boolean;
}

function toBreadcrumbs(root: string, current: string): Crumb[] {
  const sep = detectSep(root, current);
  const rootNorm = trimTrailingSep(root, sep);
  const curNorm = trimTrailingSep(current, sep);

  if (!curNorm.startsWith(rootNorm)) {
    // User navigated outside root via typing — just show the raw path
    const parts = curNorm.split(sep).filter(Boolean);
    const out: Crumb[] = [];
    let acc = '';
    for (const p of parts) {
      acc = acc ? acc + sep + p : p;
      out.push({ label: p, path: acc.startsWith(sep) || /^[A-Za-z]:/.test(acc) ? acc : sep + acc });
    }
    return out.length ? out : [{ label: curNorm || '/', path: curNorm, isRoot: true }];
  }

  const crumbs: Crumb[] = [{ label: lastSeg(rootNorm, sep), path: rootNorm, isRoot: true }];
  if (curNorm === rootNorm) return crumbs;
  const rest = curNorm.slice(rootNorm.length + 1).split(sep).filter(Boolean);
  let acc = rootNorm;
  for (const part of rest) {
    acc = acc + sep + part;
    crumbs.push({ label: part, path: acc });
  }
  return crumbs;
}

function detectSep(root: string, current: string): string {
  if (root.includes('\\') || current.includes('\\')) return '\\';
  return '/';
}

function trimTrailingSep(p: string, sep: string): string {
  if (p.length > 1 && p.endsWith(sep)) return p.slice(0, -1);
  return p;
}

function lastSeg(p: string, sep: string): string {
  const parts = p.split(sep).filter(Boolean);
  return parts[parts.length - 1] ?? p;
}
