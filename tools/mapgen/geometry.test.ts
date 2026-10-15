import { describe, expect, it } from 'vitest';
import {
  clipLine,
  clipRing,
  crossings,
  pointInRings,
  ringArea,
  samplePolyline,
  segmentIntersection,
  simplify,
  simplifyRing,
  stitchRings,
  type Pt,
} from './geometry.ts';

const p = (x: number, y: number): Pt => ({ x, y });
const square = (x0: number, y0: number, s: number): Pt[] => [
  p(x0, y0),
  p(x0 + s, y0),
  p(x0 + s, y0 + s),
  p(x0, y0 + s),
  p(x0, y0),
];

describe('segmentIntersection', () => {
  it('finds the crossing point of two segments', () => {
    expect(segmentIntersection(p(0, 0), p(2, 2), p(0, 2), p(2, 0))).toEqual(p(1, 1));
  });

  it('includes end points and rejects segments that miss', () => {
    expect(segmentIntersection(p(0, 0), p(1, 0), p(1, 0), p(1, 1))).toEqual(p(1, 0));
    expect(segmentIntersection(p(0, 0), p(1, 0), p(2, -1), p(2, 1))).toBeUndefined();
  });

  it('handles parallel and collinear segments', () => {
    expect(segmentIntersection(p(0, 0), p(1, 0), p(0, 1), p(1, 1))).toBeUndefined();
    expect(segmentIntersection(p(0, 0), p(2, 0), p(1, 0), p(3, 0))).toEqual(p(1, 0));
  });

  it('counts every crossing with a polyline', () => {
    const zigzag = [p(0, -1), p(1, 1), p(2, -1), p(3, 1)];
    expect(crossings(p(-1, 0), p(4, 0), zigzag)).toHaveLength(3);
  });
});

describe('pointInRings', () => {
  it('uses even-odd, so inner rings are holes', () => {
    const rings = [square(0, 0, 10), square(4, 4, 2)];
    expect(pointInRings(p(1, 1), rings)).toBe(true);
    expect(pointInRings(p(5, 5), rings)).toBe(false);
    expect(pointInRings(p(11, 5), rings)).toBe(false);
  });
});

describe('simplify (Douglas–Peucker)', () => {
  it('drops points within the tolerance and keeps both ends', () => {
    const line = [p(0, 0), p(1, 0.01), p(2, -0.01), p(3, 0)];
    expect(simplify(line, 0.05)).toEqual([p(0, 0), p(3, 0)]);
  });

  it('keeps points that stick out further than the tolerance', () => {
    const line = [p(0, 0), p(1, 0), p(2, 1), p(3, 0), p(4, 0)];
    expect(simplify(line, 0.1)).toEqual([p(0, 0), p(1, 0), p(2, 1), p(3, 0), p(4, 0)]);
    expect(simplify(line, 2)).toEqual([p(0, 0), p(4, 0)]);
  });

  it('keeps a closed ring closed and drops rings that collapse', () => {
    const ring = [p(0, 0), p(5, 0.001), p(10, 0), p(10, 10), p(0, 10), p(0, 0)];
    const out = simplifyRing(ring, 0.01) as Pt[];
    expect(out[0]).toEqual(out.at(-1));
    expect(out).toHaveLength(5);
    expect(simplifyRing([p(0, 0), p(1, 0), p(0, 0)], 0.01)).toBeUndefined();
  });
});

describe('stitchRings', () => {
  it('joins open pieces into a closed ring, reversing pieces where needed', () => {
    const pieces = [
      [p(0, 0), p(1, 0)],
      [p(1, 1), p(1, 0)],
      [p(1, 1), p(0, 1), p(0, 0)],
    ];
    const { rings, forced } = stitchRings(pieces);
    expect(forced).toBe(0);
    expect(rings).toHaveLength(1);
    expect(ringArea(rings[0] as Pt[])).toBeCloseTo(1);
  });

  it('closes rings that cannot be completed and counts them', () => {
    const { rings, forced } = stitchRings([[p(0, 0), p(1, 0), p(1, 1)]]);
    expect(forced).toBe(1);
    expect(rings[0]?.at(-1)).toEqual(p(0, 0));
  });
});

describe('clipping', () => {
  const box = { minX: 0, minY: 0, maxX: 10, maxY: 10 };

  it('clips a ring to the box', () => {
    const clipped = clipRing(square(5, 5, 10), box) as Pt[];
    expect(ringArea(clipped)).toBeCloseTo(25);
    expect(clipRing(square(20, 20, 1), box)).toBeUndefined();
  });

  it('splits a line where it leaves and re-enters the box', () => {
    const line = [p(-5, 5), p(5, 5), p(5, 15), p(8, 15), p(8, 5)];
    const parts = clipLine(line, box);
    expect(parts).toEqual([
      [p(0, 5), p(5, 5), p(5, 10)],
      [p(8, 10), p(8, 5)],
    ]);
  });
});

describe('samplePolyline', () => {
  it('places points no further apart than the step, including both ends', () => {
    const pts = samplePolyline([p(0, 0), p(1, 0), p(1, 0.5)], 0.3);
    expect(pts[0]).toEqual(p(0, 0));
    expect(pts.at(-1)).toEqual(p(1, 0.5));
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1] as Pt;
      const b = pts[i] as Pt;
      expect(Math.hypot(b.x - a.x, b.y - a.y)).toBeLessThanOrEqual(0.3 + 1e-12);
    }
  });
});
