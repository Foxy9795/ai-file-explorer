import { useState } from 'react';
import type { SearchHit } from '@afe/core';
import { HitRow } from './HitRow';

export function SearchTab({ root }: { root: string | null }): JSX.Element {
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await window.afe.search(query);
      setHits(res);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="body">
        {!root && <div className="empty">Select a folder to search.</div>}
        {root && hits === null && !loading && (
          <div className="empty">Ask anything in natural language — e.g. “invoice from March”.</div>
        )}
        {loading && (
          <div className="empty">
            <span className="spinner" /> Searching…
          </div>
        )}
        {error && <div className="empty" style={{ color: 'var(--err)' }}>{error}</div>}
        {hits && hits.length === 0 && !loading && (
          <div className="empty">No matches. Make sure you indexed the folder.</div>
        )}
        {hits && hits.map((h) => <HitRow key={h.file.id} hit={h} />)}
      </div>
      <div className="controls">
        <textarea
          value={query}
          placeholder="Ask in plain English…"
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              run();
            }
          }}
        />
        <button className="primary" onClick={run} disabled={!root || loading || !query.trim()}>
          Search
        </button>
      </div>
    </>
  );
}
