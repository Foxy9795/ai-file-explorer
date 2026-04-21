import { useState } from 'react';

interface Props {
  root: string | null;
  favorites: string[];
  recent: string[];
  currentPath: string | null;
  onNavigate: (path: string) => void;
  onRemoveFavorite: (path: string) => void;
  onClearRecent: () => void;
}

export function PlacesSidebar({
  root,
  favorites,
  recent,
  currentPath,
  onNavigate,
  onRemoveFavorite,
  onClearRecent,
}: Props): JSX.Element {
  const [favOpen, setFavOpen] = useState(true);
  const [recOpen, setRecOpen] = useState(true);

  return (
    <aside className="places-sidebar">
      {root && (
        <div
          className={`places-item pinned${currentPath === root ? ' active' : ''}`}
          onClick={() => onNavigate(root)}
          title={root}
        >
          <span className="places-icon">🏠</span>
          <span className="places-label">Home</span>
        </div>
      )}

      <div className="places-section">
        <button className="places-header" onClick={() => setFavOpen((v) => !v)}>
          <span className="places-chev">{favOpen ? '▾' : '▸'}</span>
          <span className="places-icon">⭐</span>
          <span className="places-label">Favorites</span>
          <span className="places-count">{favorites.length || ''}</span>
        </button>
        {favOpen && (
          <div className="places-list">
            {favorites.length === 0 ? (
              <div className="places-empty">No favorites yet. Star a folder in the address bar.</div>
            ) : (
              favorites.map((p) => (
                <div
                  key={p}
                  className={`places-item${currentPath === p ? ' active' : ''}`}
                  onClick={() => onNavigate(p)}
                  title={p}
                >
                  <span className="places-icon">📁</span>
                  <span className="places-label">{basename(p)}</span>
                  <button
                    className="places-act"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveFavorite(p);
                    }}
                    title="Remove from favorites"
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <div className="places-section">
        <button className="places-header" onClick={() => setRecOpen((v) => !v)}>
          <span className="places-chev">{recOpen ? '▾' : '▸'}</span>
          <span className="places-icon">🕘</span>
          <span className="places-label">Recent</span>
          <span className="places-count">{recent.length || ''}</span>
          {recent.length > 0 && (
            <button
              className="places-act"
              onClick={(e) => {
                e.stopPropagation();
                onClearRecent();
              }}
              title="Clear recent"
            >
              clear
            </button>
          )}
        </button>
        {recOpen && (
          <div className="places-list">
            {recent.length === 0 ? (
              <div className="places-empty">No recent folders.</div>
            ) : (
              recent.slice(0, 12).map((p) => (
                <div
                  key={p}
                  className={`places-item${currentPath === p ? ' active' : ''}`}
                  onClick={() => onNavigate(p)}
                  title={p}
                >
                  <span className="places-icon">📂</span>
                  <span className="places-label">{basename(p)}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </aside>
  );
}

function basename(p: string): string {
  const parts = p.split(/[\\/]/).filter(Boolean);
  return parts[parts.length - 1] || p;
}
