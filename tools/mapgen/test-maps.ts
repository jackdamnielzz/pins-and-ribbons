import type { CrossingRecord, HexMap, HexRecord } from './map-types.ts';
import { findMainRoute } from './validate.ts';

/** Small hand-built maps for the mapgen tests. */

export function blankHexes(cols: number, rows: number): HexRecord[] {
  const hexes: HexRecord[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      hexes.push({
        col,
        row,
        terrain: 'open',
        road: false,
        rail: false,
        elevationM: 10,
        elevationBand: 0,
        riverEdges: [],
        edgeCrossings: [],
      });
    }
  }
  return hexes;
}

/** A crossing record for tests: intact, with a source. */
export function crossingOf(
  fields: Pick<CrossingRecord, 'id' | 'banks'> & Partial<CrossingRecord>,
): CrossingRecord {
  return { kind: 'road', name: '', river: 'R', at: [0, 0], state: 'intact', source: 'test', ...fields };
}

/** A test map; `mainRoute.hexes` is filled in the way the generator does it. */
export function mapOf(
  cols: number,
  rows: number,
  hexes: HexRecord[],
  crossings: CrossingRecord[] = [],
  via: string[] = [],
): HexMap {
  const map: HexMap = {
    version: 1,
    id: 'test',
    name: 'Test',
    grid: { orientation: 'pointy', offset: 'odd-r', cols, rows, hexAcrossFlatsKm: 1, origin: [0.5, 0.577] },
    elevationBandLowerBoundsM: [15, 30],
    hexes,
    crossings,
    anchors: [],
    mainRoute: { via, note: 'test', hexes: [] },
  };
  map.mainRoute.hexes = findMainRoute(map).path.map((o) => [o.col, o.row]);
  return map;
}
