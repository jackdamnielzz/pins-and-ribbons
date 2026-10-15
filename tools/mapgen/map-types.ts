/**
 * The shape of data/maps/<region>/hexes.json (schema: data/schema/hexes.schema.json).
 * Hex positions are odd-r offset [col, row]; directions are 0–5 as in src/core/hex.
 */

export const TERRAINS = ['open', 'heath', 'polder', 'woodland', 'built-up', 'bridge', 'river'] as const;
export type Terrain = (typeof TERRAINS)[number];

export type HexPos = [col: number, row: number];

export interface HexEdgeCrossing {
  dir: number;
  crossing: string;
}

export interface HexRecord {
  col: number;
  row: number;
  terrain: Terrain;
  road: boolean;
  rail: boolean;
  /** Mean elevation in metres (SRTM) and the band index it falls in. */
  elevationM: number;
  elevationBand: number;
  /** Directions of edges that a river runs across. Mirrored on the neighbour. */
  riverEdges: number[];
  /**
   * River edges that a bridge or ferry crosses, with the crossing id. Mirrored on the neighbour.
   * One edge can carry several crossings (a road and a rail bridge close together).
   */
  edgeCrossings: HexEdgeCrossing[];
  /** Bridges or ferries that run through this hex (bridge hexes over wide water). */
  crossings?: string[];
  town?: string;
}

export interface CrossingRecord {
  id: string;
  kind: 'road' | 'rail' | 'ferry';
  name: string;
  river: string;
  osmId: string;
  /** Where the line crosses the river, map km. */
  at: [x: number, y: number];
  /** The two hexes on either bank, ordered north/west bank first. */
  banks: [HexPos, HexPos];
}

export interface AnchorRecord {
  id: string;
  name: string;
  kind: 'objective' | 'zone';
  /** Resolved hex, absent for anchors whose location is still TODO(history). */
  hex?: HexPos;
  crossing?: string;
  relation?: string;
  todo?: string;
  source: string;
}

export interface HexMap {
  version: 1;
  id: string;
  name: string;
  grid: {
    orientation: 'pointy';
    offset: 'odd-r';
    cols: number;
    rows: number;
    hexAcrossFlatsKm: number;
    /** Centre of hex [0, 0] in map km (x east, y south, from the north-west corner). */
    origin: [x: number, y: number];
  };
  elevationBandLowerBoundsM: number[];
  hexes: HexRecord[];
  crossings: CrossingRecord[];
  anchors: AnchorRecord[];
  mainRoute: { via: string[]; note: string };
}
