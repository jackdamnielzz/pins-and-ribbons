import { describe, expect, it } from 'vitest';
import {
  contour,
  joinSegments,
  parseHgt,
  resample,
  sampleTile,
  smooth,
  tileName,
  type Grid,
} from './elevation.ts';

function hgt(size: number, value: (row: number, col: number) => number): Uint8Array {
  const buf = new Uint8Array(size * size * 2);
  const view = new DataView(buf.buffer);
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++) view.setInt16((r * size + c) * 2, value(r, c), false);
  return buf;
}

describe('SRTM tiles', () => {
  it('names tiles by their south-west corner', () => {
    expect(tileName(51, 5)).toBe('N51E005');
    expect(tileName(-3, -60)).toBe('S03W060');
  });

  it('parses big-endian samples, north row first', () => {
    const tile = parseHgt(
      hgt(3, (r, c) => r * 10 + c),
      51,
      5,
    );
    expect(tile.size).toBe(3);
    // North-west corner is row 0, col 0; south-east corner is row 2, col 2.
    expect(sampleTile(tile, 5, 52)).toBe(0);
    expect(sampleTile(tile, 6, 51)).toBe(22);
  });

  it('interpolates between samples and skips voids', () => {
    const tile = parseHgt(
      hgt(3, (r, c) => (r === 2 && c === 2 ? -32768 : c * 100)),
      51,
      5,
    );
    expect(sampleTile(tile, 5.25, 52)).toBeCloseTo(50);
    expect(sampleTile(tile, 5.9, 51.1)).toBeUndefined();
    expect(sampleTile(tile, 7, 51.5)).toBeUndefined();
  });

  it('rejects files of the wrong length', () => {
    expect(() => parseHgt(new Uint8Array(10), 51, 5)).toThrow(/unexpected length/);
  });

  it('resamples onto a grid, averaging sub-samples', () => {
    const tile = parseHgt(
      hgt(11, (_r, c) => c * 10),
      51,
      5,
    );
    // Map km x maps straight to longitude here: 1 km = 0.1 degree.
    const grid = resample([tile], 1, 1, 0.5, (p) => ({ lon: 5 + p.x / 10, lat: 52 - p.y / 10 }));
    expect(grid.cols).toBe(2);
    expect(grid.rows).toBe(2);
    expect(grid.values[0]).toBeCloseTo(2.5);
    expect(grid.values[1]).toBeCloseTo(7.5);
  });
});

describe('contours', () => {
  const cone = (n: number): Grid => {
    const values = new Float32Array(n * n);
    for (let j = 0; j < n; j++)
      for (let i = 0; i < n; i++) values[j * n + i] = 100 - 10 * Math.hypot(i - (n - 1) / 2, j - (n - 1) / 2);
    return { cols: n, rows: n, cellKm: 0.1, values };
  };

  it('traces a closed ring around a hill', () => {
    // 79.5 rather than 80: a level exactly on grid values gives zero-length segments.
    const lines = contour(cone(11), 79.5);
    expect(lines).toHaveLength(1);
    const line = lines[0] as { x: number; y: number }[];
    expect(line[0]?.x).toBeCloseTo(line.at(-1)?.x as number);
    expect(line[0]?.y).toBeCloseTo(line.at(-1)?.y as number);
    // About 2 cells (0.2 km) from the centre at 0.55 km.
    for (const p of line) expect(Math.abs(Math.hypot(p.x - 0.55, p.y - 0.55) - 0.205)).toBeLessThan(0.02);
  });

  it('draws nothing above the top or below the bottom', () => {
    expect(contour(cone(11), 200)).toEqual([]);
    expect(contour(cone(11), -200)).toEqual([]);
  });

  it('joins segments that share end points', () => {
    const a = { x: 0, y: 0 };
    const b = { x: 1, y: 0 };
    const c = { x: 2, y: 0 };
    expect(
      joinSegments([
        [b, c],
        [a, b],
      ]),
    ).toEqual([[c, b, a]]);
  });

  it('smooths without changing a flat grid', () => {
    const flat: Grid = { cols: 3, rows: 3, cellKm: 1, values: new Float32Array(9).fill(7) };
    expect([...smooth(flat, 2).values]).toEqual(new Array(9).fill(7));
  });
});
