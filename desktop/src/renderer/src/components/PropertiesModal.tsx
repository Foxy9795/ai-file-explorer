import type { FileNode } from '../../../preload/types';

interface Props {
  node: FileNode;
  onClose: () => void;
}

export function PropertiesModal({ node, onClose }: Props): JSX.Element {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Properties</h3>
          <button className="btn btn-ghost" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="prop-row"><span className="prop-label">Name:</span> <span className="prop-val">{node.name}</span></div>
          <div className="prop-row"><span className="prop-label">Path:</span> <span className="prop-val">{node.path}</span></div>
          <div className="prop-row"><span className="prop-label">Type:</span> <span className="prop-val">{node.isDir ? 'Folder' : 'File'}</span></div>
          {!node.isDir && <div className="prop-row"><span className="prop-label">Size:</span> <span className="prop-val">{formatBytes(node.size ?? 0)}</span></div>}
          <div className="prop-row"><span className="prop-label">Modified:</span> <span className="prop-val">{node.mtime ? new Date(node.mtime).toLocaleString() : 'Unknown'}</span></div>
        </div>
      </div>
    </div>
  );
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(2)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}
