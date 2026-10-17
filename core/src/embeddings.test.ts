import { describe, it, expect } from 'vitest';
import { cosine } from './embeddings';

describe('embeddings', () => {
  it('should calculate cosine similarity correctly', () => {
    const a = new Float32Array([1, 0, 0]);
    const b = new Float32Array([1, 0, 0]);
    expect(cosine(a, Array.from(b))).toBeCloseTo(1);

    const c = new Float32Array([0, 1, 0]);
    expect(cosine(a, Array.from(c))).toBeCloseTo(0);

    const d = new Float32Array([-1, 0, 0]);
    expect(cosine(a, Array.from(d))).toBeCloseTo(-1);
  });
});
