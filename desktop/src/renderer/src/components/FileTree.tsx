import { useEffect, useState } from 'react';
import type { FileNode } from '../../../preload/types';

interface Props {
  root: string;
  selected: string | null;
  onSelect: (p: string) => void;
  indexBump?: number;
}

export function FileTree({ root, selected, onSelect, indexBump }: Props): JSX.Element {
  return (
    <div>
      <TreeNode
        path={root}
        name={shortName(root)}
        isDir
        depth={0}
        selected={selected}
        onSelect={onSelect}
        defaultOpen
        bumpKey={indexBump}
      />
    </div>
  );
}

function shortName(p: string): string {
  const parts = p.split(/[/\\]/).filter(Boolean);
  return parts[parts.length - 1] ?? p;
}

interface NodeProps {
  path: string;
  name: string;
  isDir: boolean;
  depth: number;
  selected: string | null;
  onSelect: (p: string) => void;
  defaultOpen?: boolean;
  bumpKey?: number;
}

function TreeNode({ path, name, isDir, depth, selected, onSelect, defaultOpen, bumpKey }: NodeProps): JSX.Element {
  const [open, setOpen] = useState(!!defaultOpen);
  const [children, setChildren] = useState<FileNode[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && isDir && !loading) {
      setLoading(true);
      window.afe
        .listDir(path)
        .then((c) => setChildren(c))
        .catch(() => setChildren([]))
        .finally(() => setLoading(false));
    }
  }, [open, isDir, path, bumpKey]);

  const isSelected = selected === path;
  return (
    <div>
      <div
        className={`tree-row${isSelected ? ' selected' : ''}`}
        style={{ paddingLeft: 10 + depth * 12 }}
        onClick={() => {
          if (isDir) setOpen((o) => !o);
          else onSelect(path);
        }}
      >
        <span className="tree-icon">{isDir ? (open ? '▾' : '▸') : '•'}</span>
        <span className="name" title={path}>
          {name}
        </span>
      </div>
      {open && isDir && children && (
        <div>
          {children.length === 0 ? (
            <div className="empty" style={{ paddingLeft: 12 + (depth + 1) * 12 }}>
              (empty)
            </div>
          ) : (
            children.map((c) => (
              <TreeNode
                key={c.path}
                path={c.path}
                name={c.name}
                isDir={c.isDir}
                depth={depth + 1}
                selected={selected}
                onSelect={onSelect}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
