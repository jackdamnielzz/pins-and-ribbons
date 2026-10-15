import { describe, expect, it } from 'vitest';
import { createRng, nextFloat, nextInt } from './rng';

describe('rng', () => {
  it('produces the same sequence for the same seed', () => {
    const a = createRng(42);
    const b = createRng(42);
    const seqA = Array.from({ length: 100 }, () => nextFloat(a));
    const seqB = Array.from({ length: 100 }, () => nextFloat(b));
    expect(seqA).toEqual(seqB);
  });

  it('produces different sequences for different seeds', () => {
    const a = createRng(1);
    const b = createRng(2);
    expect(nextFloat(a)).not.toEqual(nextFloat(b));
  });

  it('returns floats in [0, 1)', () => {
    const rng = createRng(7);
    for (let i = 0; i < 10_000; i++) {
      const v = nextFloat(rng);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('resumes the same sequence from a copied state', () => {
    const rng = createRng(99);
    nextFloat(rng);
    const saved = JSON.parse(JSON.stringify(rng)) as typeof rng;
    expect(nextFloat(saved)).toEqual(nextFloat(rng));
  });

  it('returns integers within the requested range and covers it', () => {
    const rng = createRng(3);
    const seen = new Set<number>();
    for (let i = 0; i < 1_000; i++) {
      const v = nextInt(rng, -2, 3);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(-2);
      expect(v).toBeLessThan(3);
      seen.add(v);
    }
    expect([...seen].sort((x, y) => x - y)).toEqual([-2, -1, 0, 1, 2]);
  });

  it('rejects an empty range', () => {
    expect(() => nextInt(createRng(1), 5, 5)).toThrow(RangeError);
  });
});
