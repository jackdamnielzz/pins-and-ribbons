import { describe, expect, it } from 'vitest';
import { axial, neighbours, offset, offsetToAxial } from './coords.ts';
import { hexCorners, hexToPixel, layoutAcrossFlats, pixelToHex } from './layout.ts';

const layout = layoutAcrossFlats(1, 0.5, 0.5);

describe('hexToPixel', () => {
  it('puts axial (0, 0) at the origin', () => {
    expect(hexToPixel(layout, axial(0, 0))).toEqual({ x: 0.5, y: 0.5 });
  });

  it('spaces hexes one flat-width apart in a row and 1.5 × size between rows', () => {
    const a = hexToPixel(layout, offsetToAxial(offset(0, 0)));
    const b = hexToPixel(layout, offsetToAxial(offset(1, 0)));
    const c = hexToPixel(layout, offsetToAxial(offset(0, 1)));
    expect(b.x - a.x).toBeCloseTo(1);
    expect(b.y).toBeCloseTo(a.y);
    // Odd rows are shifted half a hex to the right.
    expect(c.x - a.x).toBeCloseTo(0.5);
    expect(c.y - a.y).toBeCloseTo(1.5 / Math.sqrt(3));
  });

  it('places every neighbour one flat-width from the centre', () => {
    const centre = axial(4, -2);
    const p = hexToPixel(layout, centre);
    for (const n of neighbours(centre)) {
      const q = hexToPixel(layout, n);
      expect(Math.hypot(q.x - p.x, q.y - p.y)).toBeCloseTo(1);
    }
  });
});

describe('pixelToHex', () => {
  it('inverts hexToPixel for a grid of hexes', () => {
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const a = offsetToAxial(offset(col, row));
        expect(pixelToHex(layout, hexToPixel(layout, a))).toEqual(a);
      }
    }
  });

  it('finds the hex for points near the centre and inside the edges', () => {
    const a = axial(3, 2);
    const c = hexToPixel(layout, a);
    expect(pixelToHex(layout, { x: c.x + 0.45, y: c.y })).toEqual(a);
    expect(pixelToHex(layout, { x: c.x - 0.45, y: c.y })).toEqual(a);
    expect(pixelToHex(layout, { x: c.x, y: c.y + layout.size * 0.95 })).toEqual(a);
  });

  it('moves to the neighbour once a point crosses the edge', () => {
    const a = axial(3, 2);
    const c = hexToPixel(layout, a);
    expect(pixelToHex(layout, { x: c.x + 0.55, y: c.y })).toEqual(axial(4, 2));
    expect(pixelToHex(layout, { x: c.x - 0.55, y: c.y })).toEqual(axial(2, 2));
  });

  it('assigns every point of a dense sample to the nearest hex centre', () => {
    for (let i = 0; i < 400; i++) {
      // A deterministic scatter (no Math.random in core tests either).
      const p = { x: ((i * 0.6180339) % 1) * 6, y: ((i * 0.4142135) % 1) * 6 };
      const h = pixelToHex(layout, p);
      const hc = hexToPixel(layout, h);
      const d = Math.hypot(hc.x - p.x, hc.y - p.y);
      for (const n of neighbours(h)) {
        const nc = hexToPixel(layout, n);
        expect(d).toBeLessThanOrEqual(Math.hypot(nc.x - p.x, nc.y - p.y) + 1e-9);
      }
    }
  });
});

describe('hexCorners', () => {
  it('returns six corners at distance size, starting at the top', () => {
    const a = axial(1, 1);
    const c = hexToPixel(layout, a);
    const corners = hexCorners(layout, a);
    expect(corners).toHaveLength(6);
    for (const p of corners) expect(Math.hypot(p.x - c.x, p.y - c.y)).toBeCloseTo(layout.size);
    expect(corners[0]?.x).toBeCloseTo(c.x);
    expect(corners[0]?.y).toBeCloseTo(c.y - layout.size);
  });

  it('shares two corners with each neighbour', () => {
    const a = axial(0, 0);
    const mine = hexCorners(layout, a);
    for (const n of neighbours(a)) {
      const theirs = hexCorners(layout, n);
      const shared = mine.filter((p) => theirs.some((q) => Math.hypot(p.x - q.x, p.y - q.y) < 1e-9));
      expect(shared).toHaveLength(2);
    }
  });
});
