import { useState } from 'react';

export function TagTab({ selected }: { selected: string | null }): JSX.Element {
  const [tags, setTags] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    if (!selected) return;
    setLoading(true);
    setError(null);
    try {
      setTags(await window.afe.tag(selected));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="body">
        {!selected && <div className="empty">Select a file on the left, then click “Suggest tags”.</div>}
        {selected && !tags && !loading && !error && (
          <div className="empty">
            <div>Selected file:</div>
            <div style={{ marginTop: 6, color: 'var(--text)' }}>{selected}</div>
          </div>
        )}
        {loading && (
          <div className="empty">
            <span className="spinner" /> Thinking up tags…
          </div>
        )}
        {error && <div className="empty" style={{ color: 'var(--err)' }}>{error}</div>}
        {tags && tags.length > 0 && (
          <div style={{ padding: 6 }}>
            {tags.map((t) => (
              <span key={t} className="chip">
                #{t}
              </span>
            ))}
          </div>
        )}
        {tags && tags.length === 0 && <div className="empty">(no tags suggested)</div>}
      </div>
      <div className="controls">
        <button className="primary" onClick={run} disabled={!selected || loading} style={{ width: '100%' }}>
          Suggest tags
        </button>
      </div>
    </>
  );
}
