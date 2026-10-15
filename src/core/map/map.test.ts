import { describe, expect, it } from 'vitest';
import { hexToPixel, offset, offsetToAxial } from '../hex/index.ts';
import { toNordDeGuerre, sixFigureReference } from '../geo/nord-de-guerre.ts';
import { toRD } from '../geo/rd.ts';
import { hexAtPoint, mapLayout } from './lookup.ts';
import { gridReference, gridToMap, mapToGrid } from './reference.ts';
import type { HexMap, HexRecord } from './types.ts';

const origin = { x: 176000, y: 452000 };

function tinyMap(cols: number, rows: number): HexMap {
  const hexes: HexRecord[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      hexes.push({
        col,
        row,
        terrain: 'open',
        road: false,
        rail: false,
        elevationM: 0,
        elevationBand: 0,
        riverEdges: [],
        edgeCrossings: [],
      });
    }
  }
  return {
    version: 1,
    id: 't',
    name: 'T',
    grid: {
      orientation: 'pointy',
      offset: 'odd-r',
      cols,
      rows,
      hexAcrossFlatsKm: 1,
      origin: [0.5, 1 / Math.sqrt(3)],
    },
    elevationBandLowerBoundsM: [],
    hexes,
    crossings: [],
    anchors: [],
    mainRoute: { via: [], note: '', hexes: [] },
  };
}

describe('grid references', () => {
  it('match the Nord de Guerre reference of the same place', () => {
    // The Arnhem road bridge marker (docs/history/map.md).
    const rd = toRD({ lon: 5.91242, lat: 51.97585 });
    const p = { x: (rd.x - origin.x) / 1000, y: (origin.y - rd.y) / 1000 };
    expect(gridReference(p, origin)).toBe(sixFigureReference(toNordDeGuerre(5.91242, 51.97585)));
  });

  it('round-trip between map km and the grid to within a metre', () => {
    for (const p of [
      { x: 1, y: 1 },
      { x: 12.5, y: 17 },
      { x: 25, y: 34 },
    ]) {
      const back = gridToMap(mapToGrid(p, origin), origin);
      expect(Math.hypot(back.x - p.x, back.y - p.y) * 1000).toBeLessThan(1);
    }
  });
});

describe('hexAtPoint', () => {
  const map = tinyMap(4, 3);
  const layout = mapLayout(map);

  it('finds the hex under each hex centre', () => {
    for (const h of map.hexes) {
      const c = hexToPixel(layout, offsetToAxial(offset(h.col, h.row)));
      expect(hexAtPoint(map, layout, c.x, c.y)).toBe(h);
    }
  });

  it('returns nothing off the grid', () => {
    expect(hexAtPoint(map, layout, -2, 0.5)).toBeUndefined();
    expect(hexAtPoint(map, layout, 1, 10)).toBeUndefined();
  });
});
