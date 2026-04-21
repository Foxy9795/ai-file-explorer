import { useState } from 'react';
import type { SearchHit } from '@afe/core';
import { HitRow } from './HitRow';

export function SimilarTab({ selected }: { selected: string | null }): JSX.Element {
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    if (!selected) return;
    setLoading(true);
    setError(null);
    try {
      setHits(await window.afe.similar(selected));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="body">
        {!selected && <div className="empty">Select a file on the left, then click “Find similar”.</div>}
        {selected && !hits && !loading && !error && (
          <div className="empty">
            <div>Selected file:</div>
            <div style={{ marginTop: 6, color: 'var(--text)' }}>{selected}</div>
          </div>
        )}
        {loading && (
          <div className="empty">
            <span className="spinner" /> Scanning index…
          </div>
        )}
        {error && <div className="empty" style={{ color: 'var(--err)' }}>{error}</div>}
        {hits && hits.length === 0 && !loading && (
          <div className="empty">No similar files found. Is the index built?</div>
        )}
        {hits && hits.map((h) => <HitRow key={h.file.id} hit={h} />)}
      </div>
      <div className="controls">
        <button className="primary" onClick={run} disabled={!selected || loading} style={{ width: '100%' }}>
          Find similar
        </button>
      </div>
    </>
  );
}
