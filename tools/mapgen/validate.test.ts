import { describe, expect, it } from 'vitest';
import {
  axialToOffset,
  neighbour,
  offset,
  offsetToAxial,
  oppositeDirection,
  type Direction,
} from '../../src/core/hex/index.ts';
import type { CrossingRecord, HexRecord } from './map-types.ts';
import { blankHexes, crossingOf, mapOf } from './test-maps.ts';
import { findMainRoute, validateMap } from './validate.ts';

const COLS = 5;
const ROWS = 6;
const at = (hexes: HexRecord[], col: number, row: number): HexRecord => hexes[row * COLS + col] as HexRecord;

/** Adds a mirrored river edge from (col, row) in direction d. */
function riverEdge(hexes: HexRecord[], col: number, row: number, d: Direction): void {
  const n = axialToOffset(neighbour(offsetToAxial(offset(col, row)), d));
  at(hexes, col, row).riverEdges.push(d);
  at(hexes, n.col, n.row).riverEdges.push(oppositeDirection(d));
}

/** A river between rows 2 and 3 across the whole map: every south-west and south-east edge of row 2. */
function riverAcross(hexes: HexRecord[]): void {
  for (let col = 0; col < COLS; col++) {
    riverEdge(hexes, col, 2, 5);
    if (col > 0) riverEdge(hexes, col, 2, 4);
  }
}

/** A road down column 2 with a bridge over the river edge it crosses. */
function bridgedRoad(hexes: HexRecord[]): CrossingRecord {
  for (let row = 0; row < ROWS; row++) {
    const col = row % 2 === 1 ? 1 : 2;
    at(hexes, col, row).road = true;
  }
  // Row 2 (even) col 2 → south-west (4) is (1, 3), which is on the road.
  at(hexes, 2, 2).edgeCrossings.push({ dir: 4, crossing: 'bridge' });
  at(hexes, 1, 3).edgeCrossings.push({ dir: 1, crossing: 'bridge' });
  return crossingOf({
    id: 'bridge',
    name: 'Bridge',
    banks: [
      [2, 2],
      [1, 3],
    ],
  });
}

describe('validateMap', () => {
  it('accepts a map with a closed river and a bridge on the main road', () => {
    const hexes = blankHexes(COLS, ROWS);
    riverAcross(hexes);
    const bridge = bridgedRoad(hexes);
    const result = validateMap(mapOf(COLS, ROWS, hexes, [bridge], ['bridge']));
    expect(result.errors).toEqual([]);
  });

  it('reports a gap in a river barrier', () => {
    const hexes = blankHexes(COLS, ROWS);
    riverAcross(hexes);
    // Remove the river edge between (3, 2) and its south-east neighbour (3, 3).
    at(hexes, 3, 2).riverEdges = at(hexes, 3, 2).riverEdges.filter((d) => d !== 5);
    at(hexes, 3, 3).riverEdges = at(hexes, 3, 3).riverEdges.filter((d) => d !== 2);
    const errors = validateMap(mapOf(COLS, ROWS, hexes)).errors;
    expect(errors.some((e) => e.startsWith('river barrier leaks'))).toBe(true);
  });

  it('reports a crossing whose banks are connected without it', () => {
    const hexes = blankHexes(COLS, ROWS);
    riverEdge(hexes, 2, 2, 4);
    at(hexes, 2, 2).edgeCrossings.push({ dir: 4, crossing: 'b' });
    at(hexes, 1, 3).edgeCrossings.push({ dir: 1, crossing: 'b' });
    const crossing = crossingOf({
      id: 'b',
      banks: [
        [2, 2],
        [1, 3],
      ],
    });
    const errors = validateMap(mapOf(COLS, ROWS, hexes, [crossing])).errors;
    expect(errors.some((e) => e.includes('crossing b: banks'))).toBe(true);
  });

  it('reports river edges and crossings that are not mirrored', () => {
    const hexes = blankHexes(COLS, ROWS);
    at(hexes, 2, 2).riverEdges.push(0);
    at(hexes, 2, 2).edgeCrossings.push({ dir: 0, crossing: 'nowhere' });
    const errors = validateMap(mapOf(COLS, ROWS, hexes)).errors;
    expect(errors.some((e) => e.includes('is not mirrored'))).toBe(true);
    expect(errors.some((e) => e.includes('unknown crossing nowhere'))).toBe(true);
  });

  it('reports a main road that does not reach the bridge', () => {
    const hexes = blankHexes(COLS, ROWS);
    riverAcross(hexes);
    const bridge = bridgedRoad(hexes);
    at(hexes, 1, 5).road = false;
    at(hexes, 2, 4).road = false;
    const errors = validateMap(mapOf(COLS, ROWS, hexes, [bridge], ['bridge'])).errors;
    expect(errors.some((e) => e.startsWith('main road'))).toBe(true);
  });

  it('reports a main road waypoint that is not on the map', () => {
    const hexes = blankHexes(COLS, ROWS);
    at(hexes, 0, ROWS - 1).road = true;
    const errors = validateMap(mapOf(COLS, ROWS, hexes, [], ['missing'])).errors;
    expect(errors).toContain('main road: waypoint(s) missing are not on the map');
  });

  it('stores the main road and passes it through waypoint hexes in order', () => {
    const hexes = blankHexes(COLS, ROWS);
    riverAcross(hexes);
    const bridge = bridgedRoad(hexes);
    const anchors = [
      { id: 'top', name: 'Top', kind: 'waypoint' as const, source: 's', hex: [2, 0] as [number, number] },
    ];
    const map = mapOf(COLS, ROWS, hexes, [bridge], ['bridge', 'top']);
    map.anchors = anchors;
    map.mainRoute.hexes = findMainRoute(map).path.map((o) => [o.col, o.row]);
    expect(validateMap(map).errors).toEqual([]);
    expect(map.mainRoute.hexes[0]).toEqual([1, 5]);
    expect(map.mainRoute.hexes.at(-1)).toEqual([2, 0]);
    map.mainRoute.hexes = map.mainRoute.hexes.slice(1);
    expect(validateMap(map).errors).toContain(
      'main road: mainRoute.hexes does not match the road found over the waypoints',
    );
  });

  it('does not route the main road over a crossing that is not intact', () => {
    const hexes = blankHexes(COLS, ROWS);
    riverAcross(hexes);
    const bridge = { ...bridgedRoad(hexes), state: 'blown' as const };
    const errors = validateMap(mapOf(COLS, ROWS, hexes, [bridge], ['bridge'])).errors;
    expect(errors).toContain('main road: no road path from the south edge to bridge');
  });

  it('rejects crossings with an unknown state or no source', () => {
    const hexes = blankHexes(COLS, ROWS);
    const bad = crossingOf({
      id: 'x',
      banks: [
        [0, 0],
        [1, 0],
      ],
      source: ' ',
    });
    const odd = {
      ...crossingOf({
        id: 'y',
        banks: [
          [0, 0],
          [1, 0],
        ],
      }),
      state: 'sunk',
    } as unknown as CrossingRecord;
    const errors = validateMap(mapOf(COLS, ROWS, hexes, [bad, odd])).errors;
    expect(errors).toContain('crossing x has no source');
    expect(errors).toContain('crossing y has unknown state sunk');
  });

  it('reports anchors without a hex and warns about TODO(history) anchors', () => {
    const hexes = blankHexes(COLS, ROWS);
    const map = mapOf(COLS, ROWS, hexes);
    map.anchors = [
      { id: 'a', name: 'A', kind: 'zone', source: 's' },
      { id: 'b', name: 'B', kind: 'zone', source: 's', todo: 'TODO(history): where' },
      { id: 'c', name: 'C', kind: 'objective', source: 's', hex: [99, 0] },
    ];
    const result = validateMap(map);
    expect(result.errors).toContain('zone a has no hex');
    expect(result.errors.some((e) => e.includes('objective c hex [99,0] is off the map'))).toBe(true);
    expect(result.warnings.some((w) => w.includes('zone b'))).toBe(true);
  });

  it('rejects an incomplete grid', () => {
    const hexes = blankHexes(COLS, ROWS).slice(1);
    expect(validateMap(mapOf(COLS, ROWS, hexes)).errors[0]).toMatch(/expected 30 hexes/);
  });
});
