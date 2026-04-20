import { useState } from 'react';

export function SummaryTab({ selected }: { selected: string | null }): JSX.Element {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    if (!selected) return;
    setLoading(true);
    setError(null);
    try {
      setSummary(await window.afe.summarize(selected));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="body">
        {!selected && <div className="empty">Select a file on the left, then click “Summarize”.</div>}
        {selected && !summary && !loading && !error && (
          <div className="empty">
            <div>Selected file:</div>
            <div style={{ marginTop: 6, color: 'var(--text)' }}>{selected}</div>
          </div>
        )}
        {loading && (
          <div className="empty">
            <span className="spinner" /> Summarizing…
          </div>
        )}
        {error && <div className="empty" style={{ color: 'var(--err)' }}>{error}</div>}
        {summary && (
          <div className="hit">
            <div className="hit-snippet" style={{ whiteSpace: 'pre-wrap' }}>{summary}</div>
          </div>
        )}
      </div>
      <div className="controls">
        <button className="primary" onClick={run} disabled={!selected || loading} style={{ width: '100%' }}>
          Summarize file
        </button>
      </div>
    </>
  );
}
