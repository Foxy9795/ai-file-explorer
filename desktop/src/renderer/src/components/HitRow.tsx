import type { SearchHit } from '@afe/core';

interface Props {
  hit: SearchHit;
  onOpen?: (path: string) => void;
}

export function HitRow({ hit }: Props): JSX.Element {
  return (
    <div className="hit">
      <div className="hit-head">
        <div className="hit-path" title={hit.file.path}>
          {shorten(hit.file.path)}
        </div>
        <div className="hit-score">{hit.score.toFixed(3)}</div>
      </div>
      {hit.snippet && <div className="hit-snippet">{hit.snippet}</div>}
    </div>
  );
}

function shorten(p: string): string {
  const parts = p.split(/[/\\]/);
  if (parts.length <= 3) return p;
  return `…/${parts.slice(-3).join('/')}`;
}
