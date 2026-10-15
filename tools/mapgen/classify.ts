import {
  axialToOffset,
  directionTo,
  hexToPixel,
  inBounds,
  layoutAcrossFlats,
  neighbour,
  offset,
  offsetKey,
  offsetToAxial,
  oppositeDirection,
  pixelToHex,
  type Direction,
  type Layout,
  type Offset,
} from '../../src/core/hex/index.ts';
import {
  boundsOf,
  boxesOverlap,
  crossings,
  samplePolyline,
  type Box,
  type Pt,
  type Ring,
} from './geometry.ts';
import type { CrossingRecord, HexPos, HexRecord, Terrain } from '../../src/core/map/types.ts';

/** PLAN 9 step 6: hex classification. All coordinates here are map km. */

export interface HexGrid {
  cols: number;
  rows: number;
  layout: Layout;
  widthKm: number;
  heightKm: number;
}

export function makeGrid(cols: number, rows: number, acrossFlatsKm: number): HexGrid {
  const size = acrossFlatsKm / Math.sqrt(3);
  const layout = layoutAcrossFlats(acrossFlatsKm, acrossFlatsKm / 2, size);
  return {
    cols,
    rows,
    layout,
    widthKm: (cols + 0.5) * acrossFlatsKm,
    heightKm: size * (1.5 * rows + 0.5),
  };
}

export function hexAt(grid: HexGrid, p: Pt): Offset | undefined {
  const o = axialToOffset(pixelToHex(grid.layout, p));
  return inBounds(o, grid.cols, grid.rows) ? o : undefined;
}

export function centreOf(grid: HexGrid, o: Offset): Pt {
  return hexToPixel(grid.layout, offsetToAxial(o));
}

export function indexOf(grid: HexGrid, o: Offset): number {
  return o.row * grid.cols + o.col;
}

export function neighbourOf(grid: HexGrid, o: Offset, d: Direction): Offset | undefined {
  const n = axialToOffset(neighbour(offsetToAxial(o), d));
  return inBounds(n, grid.cols, grid.rows) ? n : undefined;
}

// ---------------------------------------------------------------------------------------------
// Land cover

/** Land-cover classes in priority order, lowest first (PLAN 9: river > built-up > woodland > heath). */
export const COVER_CLASSES = ['none', 'heath', 'woodland', 'built-up', 'river'] as const;
export type CoverClass = (typeof COVER_CLASSES)[number];

export interface CoverPolygon {
  cover: Exclude<CoverClass, 'none'>;
  rings: Ring[];
}

/**
 * Rasterises cover polygons at `cellKm` (even-odd fill, so holes work) and counts, per hex,
 * how many cells fall in each class. Where polygons overlap, the higher-priority class wins.
 */
export function coverShares(grid: HexGrid, polygons: CoverPolygon[], cellKm: number): Float64Array[] {
  const cols = Math.ceil(grid.widthKm / cellKm);
  const rows = Math.ceil(grid.heightKm / cellKm);
  const raster = new Uint8Array(cols * rows);
  for (const poly of polygons) {
    const value = COVER_CLASSES.indexOf(poly.cover);
    const edges: [Pt, Pt][] = [];
    for (const ring of poly.rings) {
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++)
        edges.push([ring[j] as Pt, ring[i] as Pt]);
    }
    const box = boundsOf(poly.rings.flat());
    const j0 = Math.max(0, Math.floor(box.minY / cellKm));
    const j1 = Math.min(rows - 1, Math.ceil(box.maxY / cellKm));
    for (let j = j0; j <= j1; j++) {
      const y = (j + 0.5) * cellKm;
      const xs: number[] = [];
      for (const [a, b] of edges) {
        if (a.y > y !== b.y > y) xs.push(a.x + ((y - a.y) * (b.x - a.x)) / (b.y - a.y));
      }
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const i0 = Math.max(0, Math.ceil((xs[k] as number) / cellKm - 0.5));
        const i1 = Math.min(cols - 1, Math.floor((xs[k + 1] as number) / cellKm - 0.5));
        for (let i = i0; i <= i1; i++) {
          const at = j * cols + i;
          if ((raster[at] as number) < value) raster[at] = value;
        }
      }
    }
  }
  const counts = Array.from({ length: grid.cols * grid.rows }, () => new Float64Array(COVER_CLASSES.length));
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const o = hexAt(grid, { x: (i + 0.5) * cellKm, y: (j + 0.5) * cellKm });
      if (!o) continue;
      const c = counts[indexOf(grid, o)] as Float64Array;
      const k = raster[j * cols + i] as number;
      c[k] = (c[k] as number) + 1;
    }
  }
  for (const c of counts) {
    const total = c.reduce((s, v) => s + v, 0);
    if (total > 0) for (let k = 0; k < c.length; k++) c[k] = (c[k] as number) / total;
  }
  return counts;
}

export interface ClassifyOptions {
  minShare: Record<'river' | 'built-up' | 'woodland' | 'heath', number>;
  polderMaxElevationM: number;
}

/** 1944 evidence for one hex that today's land cover cannot give. */
export interface HistoricCover {
  /** Share of the hex covered by building footprints from 1944 or earlier (BAG). */
  footprintShare: number;
  minFootprintShare: number;
  /** Share of the hex inside a sourced settlement-core mask. */
  coreShare: number;
  coreMinShare: number;
  /** Share of the hex inside sourced 1944 heath polygons. */
  heathShare: number;
  heathMinShare: number;
}

/**
 * Terrain for one hex. Priority river > built-up > woodland > heath (PLAN 9): river from
 * today's water areas; built-up from 1944 building footprints or a settlement-core mask; then
 * sourced 1944 heath; then woodland and heath from today's land cover, where the first class
 * whose share reaches its minimum wins, otherwise the largest class does. Land with no cover
 * class is polder when low-lying and open fields otherwise.
 */
export function terrainFor(
  shares: Float64Array,
  elevationM: number,
  options: ClassifyOptions,
  history: HistoricCover,
): Terrain {
  const share = (c: CoverClass): number => shares[COVER_CLASSES.indexOf(c)] as number;
  if (share('river') >= options.minShare.river) return 'river';
  if (history.footprintShare >= history.minFootprintShare || history.coreShare >= history.coreMinShare) {
    return 'built-up';
  }
  if (history.heathShare >= history.heathMinShare) return 'heath';
  const order = ['woodland', 'heath'] as const;
  for (const c of order) if (share(c) >= options.minShare[c]) return c;
  const best = order.reduce((a, b) => (share(b) > share(a) ? b : a));
  if (share(best) > share('none')) return best;
  return elevationM <= options.polderMaxElevationM ? 'polder' : 'open';
}

// ---------------------------------------------------------------------------------------------
// Lines: roads, rail, rivers

/** Hexes a polyline passes through, sampled every 50 m. */
export function hexesOnLine(grid: HexGrid, line: Pt[]): Offset[] {
  const out: Offset[] = [];
  let last = '';
  for (const p of samplePolyline(line, 0.05)) {
    const o = hexAt(grid, p);
    if (!o) {
      last = '';
      continue;
    }
    const k = offsetKey(o);
    if (k !== last) out.push(o);
    last = k;
  }
  return out;
}

export interface IndexedLine {
  line: Pt[];
  box: Box;
  name: string;
}

export function indexLines(lines: { line: Pt[]; name: string }[]): IndexedLine[] {
  return lines.map((l) => ({ ...l, box: boundsOf(l.line) }));
}

/** Rivers crossing segment ab, by name. */
export function riversCrossing(a: Pt, b: Pt, rivers: IndexedLine[]): string[] {
  const box = boundsOf([a, b]);
  const names = new Set<string>();
  for (const r of rivers) {
    if (!boxesOverlap(box, r.box)) continue;
    if (crossings(a, b, r.line).length > 0) names.add(r.name);
  }
  return [...names];
}

/**
 * Marks river edges: an edge between two hexes is a river edge when the straight line
 * between their centres crosses a barrier river. Any path of hex steps from one bank to the
 * other must then cross a marked edge, so the river is a continuous barrier by construction.
 */
export function markRiverEdges(
  grid: HexGrid,
  hexes: HexRecord[],
  rivers: IndexedLine[],
): Map<string, string[]> {
  const edgeRivers = new Map<string, string[]>();
  for (const h of hexes) {
    const o = offset(h.col, h.row);
    for (const d of [0, 4, 5] as Direction[]) {
      const n = neighbourOf(grid, o, d);
      if (!n) continue;
      const names = riversCrossing(centreOf(grid, o), centreOf(grid, n), rivers);
      if (names.length === 0) continue;
      h.riverEdges.push(d);
      (hexes[indexOf(grid, n)] as HexRecord).riverEdges.push(oppositeDirection(d));
      edgeRivers.set(edgeKey(o, n), names);
    }
  }
  for (const h of hexes) h.riverEdges.sort((a, b) => a - b);
  return edgeRivers;
}

export function edgeKey(a: Offset, b: Offset): string {
  const [p, q] = [offsetKey(a), offsetKey(b)].sort();
  return `${p}|${q}`;
}

// ---------------------------------------------------------------------------------------------
// Crossings: bridges and ferries

export interface CrossingLine {
  kind: CrossingRecord['kind'];
  name: string;
  osmId?: string;
  line: Pt[];
}

/** The sourced crossing a candidate belongs to; several candidates can share one. */
export interface CrossingMeta {
  id: string;
  name: string;
  state: CrossingRecord['state'];
  fate?: string;
  source: string;
}

export interface CrossingCandidate {
  kind: CrossingRecord['kind'];
  name: string;
  osmId?: string;
  river: string;
  at: Pt;
  /** Unit direction of the bridge axis at the crossing point. */
  axis: Pt;
  meta?: CrossingMeta;
}

/** Every point where a road, rail or ferry line crosses a barrier river, with the bridge axis there. */
export function findCrossingPoints(lines: CrossingLine[], rivers: IndexedLine[]): CrossingCandidate[] {
  const out: CrossingCandidate[] = [];
  for (const l of lines) {
    const box = boundsOf(l.line);
    const relevant = rivers.filter((r) => boxesOverlap(box, r.box));
    for (let i = 1; i < l.line.length; i++) {
      const a = l.line[i - 1] as Pt;
      const b = l.line[i] as Pt;
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      if (len === 0) continue;
      const ux = (b.x - a.x) / len;
      const uy = (b.y - a.y) / len;
      for (const r of relevant) {
        for (const p of crossings(a, b, r.line)) {
          out.push({
            kind: l.kind,
            name: l.name,
            ...(l.osmId ? { osmId: l.osmId } : {}),
            river: r.name,
            at: p,
            axis: { x: ux, y: uy },
          });
        }
      }
    }
  }
  return out;
}

/** Unit direction of the named river's line nearest to a point. */
export function riverDirectionAt(at: Pt, river: string, rivers: IndexedLine[]): Pt | undefined {
  let best: { d: number; dir: Pt } | undefined;
  for (const r of rivers.filter((x) => x.name === river)) {
    for (let i = 1; i < r.line.length; i++) {
      const a = r.line[i - 1] as Pt;
      const b = r.line[i] as Pt;
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      if (len === 0) continue;
      const t = Math.max(
        0,
        Math.min(1, ((at.x - a.x) * (b.x - a.x) + (at.y - a.y) * (b.y - a.y)) / len ** 2),
      );
      const d = Math.hypot(a.x + t * (b.x - a.x) - at.x, a.y + t * (b.y - a.y) - at.y);
      if (!best || d < best.d) best = { d, dir: { x: (b.x - a.x) / len, y: (b.y - a.y) / len } };
    }
  }
  return best?.dir;
}

/**
 * A crossing that is not in OpenStreetMap, placed from a sourced point: its axis runs across
 * the nearest stretch of the named river.
 */
export function manualCandidate(
  at: Pt,
  river: string,
  rivers: IndexedLine[],
  kind: CrossingRecord['kind'],
  meta: CrossingMeta,
): CrossingCandidate | undefined {
  const dir = riverDirectionAt(at, river, rivers);
  if (!dir) return undefined;
  return { kind, name: meta.name, river, at, axis: { x: -dir.y, y: dir.x }, meta };
}

/**
 * Orders two bank hexes north bank first, or west bank first where the river runs north–south:
 * the first is on the left of the river's local direction, taken eastwards (or northwards).
 */
export function orderBanks(grid: HexGrid, banks: [HexPos, HexPos], at: Pt, riverDir: Pt): [HexPos, HexPos] {
  const east = Math.abs(riverDir.x) >= Math.abs(riverDir.y);
  const flip = east ? riverDir.x < 0 : riverDir.y > 0;
  const d = flip ? { x: -riverDir.x, y: -riverDir.y } : riverDir;
  // Map y grows southwards, so the left of an eastward direction is north.
  const side = (h: HexPos): number => {
    const c = centreOf(grid, offset(h[0], h[1]));
    return d.x * (c.y - at.y) - d.y * (c.x - at.x);
  };
  return side(banks[0]) <= side(banks[1]) ? banks : [banks[1], banks[0]];
}

/**
 * Turns crossing points into crossings on the hex grid. Within the window around each point,
 * every step of the hex walk across an edge of the same river gets the crossing, and every water
 * hex on the walk becomes a bridge hex (for bridges) or carries the crossing (for ferries).
 * Points whose walk crosses no river edge and no water hex need no crossing and are dropped.
 */
export function placeCrossings(
  grid: HexGrid,
  hexes: HexRecord[],
  edgeRivers: Map<string, string[]>,
  rivers: IndexedLine[],
  candidates: CrossingCandidate[],
  windowKm: number,
): CrossingRecord[] {
  const records: CrossingRecord[] = [];
  const isWater = (o: Offset): boolean => {
    const t = (hexes[indexOf(grid, o)] as HexRecord).terrain;
    return t === 'river' || t === 'bridge';
  };
  for (const c of candidates) {
    // OSM bridge ways are often only a few hundred metres long, so the walk follows the bridge
    // axis to either side of the crossing point, growing until it reaches land on both banks.
    let walk: Offset[] = [];
    let edges: [Offset, Offset][] = [];
    let water: Offset[] = [];
    let banks: [HexPos, HexPos] | undefined;
    for (let reach = windowKm; reach <= windowKm * 3 && !banks; reach += windowKm) {
      walk = hexesOnLine(grid, [
        { x: c.at.x - c.axis.x * reach, y: c.at.y - c.axis.y * reach },
        { x: c.at.x + c.axis.x * reach, y: c.at.y + c.axis.y * reach },
      ]);
      edges = [];
      water = walk.filter(isWater);
      for (let i = 1; i < walk.length; i++) {
        const prev = walk[i - 1] as Offset;
        const h = walk[i] as Offset;
        // Only edges of the river this crossing spans; a long window can reach another river.
        if (edgeRivers.get(edgeKey(prev, h))?.includes(c.river)) edges.push([prev, h]);
      }
      if (edges.length === 0 && water.length === 0) break;
      banks = bankHexes(walk, edges, isWater);
    }
    if (!banks) continue;
    // Several crossing points (both carriageways, both tracks, both river lines) belong to one
    // sourced crossing; candidates without one have no 1944 source and are skipped.
    const meta = c.meta;
    if (!meta) continue;
    let record = records.find((r) => r.id === meta.id);
    if (!record) {
      const dir = riverDirectionAt(c.at, c.river, rivers);
      if (dir) banks = orderBanks(grid, banks, c.at, dir);
      record = {
        id: meta.id,
        kind: c.kind,
        name: meta.name,
        river: c.river,
        ...(c.osmId ? { osmId: c.osmId } : {}),
        at: [round3(c.at.x), round3(c.at.y)],
        banks,
        state: meta.state,
        ...(meta.fate ? { fate: meta.fate } : {}),
        source: meta.source,
      };
      records.push(record);
    }
    const id = record.id;
    for (const [a, b] of edges) {
      const d = directionTo(offsetToAxial(a), offsetToAxial(b)) as Direction;
      addEdgeCrossing(hexes[indexOf(grid, a)] as HexRecord, d, id);
      addEdgeCrossing(hexes[indexOf(grid, b)] as HexRecord, oppositeDirection(d), id);
    }
    for (const w of water) {
      const h = hexes[indexOf(grid, w)] as HexRecord;
      h.crossings = [...new Set([...(h.crossings ?? []), id])].sort();
      if (c.kind === 'road' || c.kind === 'rail') h.terrain = 'bridge';
    }
  }
  return records;
}

function addEdgeCrossing(h: HexRecord, dir: number, crossing: string): void {
  if (!h.edgeCrossings.some((e) => e.dir === dir && e.crossing === crossing))
    h.edgeCrossings.push({ dir, crossing });
  h.edgeCrossings.sort((a, b) => a.dir - b.dir || a.crossing.localeCompare(b.crossing));
}

/**
 * The land hexes on either side of the river along a crossing walk: the last land hex before
 * the first river step and the first land hex after the last one, in walk order.
 */
function bankHexes(
  walk: Offset[],
  edges: [Offset, Offset][],
  isWater: (o: Offset) => boolean,
): [HexPos, HexPos] | undefined {
  const at = (o: Offset): number => walk.indexOf(o);
  const steps = [
    ...edges.flatMap(([a, b]) => [at(a), at(b)]),
    ...walk.flatMap((h, i) => (isWater(h) ? [i] : [])),
  ];
  if (steps.length === 0) return undefined;
  const first = Math.min(...steps);
  const last = Math.max(...steps);
  const a = walk
    .slice(0, first + 1)
    .filter((h) => !isWater(h))
    .at(-1);
  const b = walk.slice(last).find((h) => !isWater(h));
  if (!a || !b) return undefined;
  return [
    [a.col, a.row],
    [b.col, b.row],
  ];
}

export function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
