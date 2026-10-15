import type { CrossingRecord, HexMap, HexRecord } from './map-types.ts';

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

export function mapOf(
  cols: number,
  rows: number,
  hexes: HexRecord[],
  crossings: CrossingRecord[] = [],
  via: string[] = [],
): HexMap {
  return {
    version: 1,
    id: 'test',
    name: 'Test',
    grid: { orientation: 'pointy', offset: 'odd-r', cols, rows, hexAcrossFlatsKm: 1, origin: [0.5, 0.577] },
    elevationBandLowerBoundsM: [15, 30],
    hexes,
    crossings,
    anchors: [],
    mainRoute: { via, note: 'test' },
  };
}
