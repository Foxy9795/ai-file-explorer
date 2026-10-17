import { render, screen } from '@testing-library/react';
import { HitRow } from './HitRow';
import { describe, it, expect } from 'vitest';

describe('HitRow', () => {
  it('renders correctly', () => {
    const hit = {
      file: { path: '/some/path/file.txt', name: 'file.txt', ext: '.txt', size: 10, mtime: 100, isDir: false },
      score: 0.876,
      snippet: 'This is a test snippet',
      chunkOrdinal: 0
    };
    render(
      <HitRow
        hit={hit as unknown as import('@afe/core').SearchHit}
      />
    );

    expect(screen.getByText('…/some/path/file.txt')).toBeInTheDocument();
    expect(screen.getByText('0.876')).toBeInTheDocument();
    expect(screen.getByText('This is a test snippet')).toBeInTheDocument();
  });
});
