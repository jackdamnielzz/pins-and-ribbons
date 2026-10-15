import {
  axialToOffset,
  inBounds,
  neighbour,
  offset,
  offsetToAxial,
  oppositeDirection,
  type Direction,
  type Offset,
} from '../../src/core/hex/index.ts';
import { TERRAINS, type HexMap, type HexPos, type HexRecord } from './map-types.ts';

/**
 * PLAN 9 step 7. Works on a finished hexes.json, so the generator and the tests run the
 * same checks. Returns a list of errors (empty when the map is valid) and warnings.
 */

export interface ValidationResult {
  errors: string[];
  warnings: string[];
}

interface MapIndex {
  map: HexMap;
  at: (o: Offset) => HexRecord | undefined;
  neighbourOf: (o: Offset, d: Direction) => Offset | undefined;
}

function indexMap(map: HexMap): MapIndex {
  const { cols, rows } = map.grid;
  const at = (o: Offset): HexRecord | undefined =>
    inBounds(o, cols, rows) ? map.hexes[o.row * cols + o.col] : undefined;
  const neighbourOf = (o: Offset, d: Direction): Offset | undefined => {
    const n = axialToOffset(neighbour(offsetToAxial(o), d));
    return inBounds(n, cols, rows) ? n : undefined;
  };
  return { map, at, neighbourOf };
}

/** Whether a unit can be in this hex. Closed crossings make bridge hexes impassable. */
function standable(h: HexRecord, crossingsOpen: boolean): boolean {
  if (crossingsOpen) return h.terrain !== 'river' || (h.crossings?.length ?? 0) > 0;
  return h.terrain !== 'river' && h.terrain !== 'bridge';
}

/**
 * Whether a unit could step from hex o in direction d.
 * With `crossingsOpen` false, bridges and ferries are closed, so only land movement counts.
 */
function canStep(ix: MapIndex, o: Offset, d: Direction, crossingsOpen: boolean): Offset | undefined {
  const n = ix.neighbourOf(o, d);
  if (!n) return undefined;
  const from = ix.at(o) as HexRecord;
  const to = ix.at(n) as HexRecord;
  if (!standable(to, crossingsOpen)) return undefined;
  if (from.riverEdges.includes(d)) {
    if (!crossingsOpen) return undefined;
    if (!from.edgeCrossings.some((e) => e.dir === d)) return undefined;
  }
  return n;
}

/** Connected land components; -1 for hexes nothing can stand on. */
function components(ix: MapIndex, crossingsOpen: boolean): Int32Array {
  const { cols, rows } = ix.map.grid;
  const comp = new Int32Array(cols * rows).fill(-1);
  let next = 0;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const start = offset(col, row);
      const h = ix.at(start) as HexRecord;
      if (!standable(h, crossingsOpen) || (comp[row * cols + col] as number) >= 0) continue;
      const id = next++;
      comp[row * cols + col] = id;
      const queue = [start];
      while (queue.length > 0) {
        const o = queue.pop() as Offset;
        for (let d = 0; d < 6; d++) {
          const n = canStep(ix, o, d as Direction, crossingsOpen);
          if (!n || (comp[n.row * cols + n.col] as number) >= 0) continue;
          comp[n.row * cols + n.col] = id;
          queue.push(n);
        }
      }
    }
  }
  return comp;
}

/**
 * Whether a road path leads from any of `starts` over each crossing in `via`, in order.
 * Steps go between road hexes (or bridge and ferry hexes); a stage is complete when the
 * path crosses an edge carrying that crossing or enters a hex the crossing runs through.
 * Returns the number of crossings reached in order (via.length means the route is complete).
 */
function routeStages(ix: MapIndex, starts: Offset[], via: string[]): number {
  const { cols } = ix.map.grid;
  const seen = new Set<string>();
  const key = (o: Offset, stage: number): string => `${o.row * cols + o.col}:${stage}`;
  const queue: [Offset, number][] = [];
  let best = 0;
  for (const s of starts) {
    seen.add(key(s, 0));
    queue.push([s, 0]);
  }
  for (let head = 0; head < queue.length; head++) {
    const [o, stage] = queue[head] as [Offset, number];
    best = Math.max(best, stage);
    if (stage === via.length) return stage;
    const from = ix.at(o) as HexRecord;
    for (let d = 0; d < 6; d++) {
      const n = canStep(ix, o, d as Direction, true);
      if (!n) continue;
      const to = ix.at(n) as HexRecord;
      if (!to.road && !to.crossings?.length) continue;
      const target = via[stage] as string;
      const uses =
        from.edgeCrossings.some((e) => e.dir === d && e.crossing === target) ||
        (to.crossings ?? []).includes(target);
      const next = uses ? stage + 1 : stage;
      if (seen.has(key(n, next))) continue;
      seen.add(key(n, next));
      queue.push([n, next]);
    }
  }
  return best;
}

const pos = (p: HexPos): Offset => offset(p[0], p[1]);
const label = (o: Offset): string => `[${o.col},${o.row}]`;

export function validateMap(map: HexMap): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const { cols, rows } = map.grid;
  const ix = indexMap(map);

  // The grid is complete, in row-major order, and every value is in range.
  if (map.hexes.length !== cols * rows)
    errors.push(`expected ${cols * rows} hexes, found ${map.hexes.length}`);
  map.hexes.forEach((h, i) => {
    if (h.col !== i % cols || h.row !== Math.floor(i / cols))
      errors.push(`hex ${i} is out of order: ${label(h)}`);
    if (!TERRAINS.includes(h.terrain)) errors.push(`hex ${label(h)} has unknown terrain ${h.terrain}`);
    if (h.elevationBand < 0 || h.elevationBand > map.elevationBandLowerBoundsM.length) {
      errors.push(`hex ${label(h)} has elevation band ${h.elevationBand} out of range`);
    }
  });
  if (errors.length > 0) return { errors, warnings };

  // River edges and edge crossings are mirrored on both sides, and crossings exist.
  const crossingIds = new Set(map.crossings.map((c) => c.id));
  for (const h of map.hexes) {
    const o = offset(h.col, h.row);
    for (const d of h.riverEdges) {
      const n = ix.neighbourOf(o, d as Direction);
      if (!n) {
        errors.push(`hex ${label(o)} has a river edge ${d} off the map`);
        continue;
      }
      if (!(ix.at(n) as HexRecord).riverEdges.includes(oppositeDirection(d as Direction))) {
        errors.push(`river edge ${label(o)} dir ${d} is not mirrored on ${label(n)}`);
      }
    }
    for (const e of h.edgeCrossings) {
      if (!h.riverEdges.includes(e.dir))
        errors.push(`hex ${label(o)} has a crossing on edge ${e.dir} with no river`);
      if (!crossingIds.has(e.crossing))
        errors.push(`hex ${label(o)} refers to unknown crossing ${e.crossing}`);
      const n = ix.neighbourOf(o, e.dir as Direction);
      const back =
        n &&
        (ix.at(n) as HexRecord).edgeCrossings.some(
          (x) => x.dir === oppositeDirection(e.dir as Direction) && x.crossing === e.crossing,
        );
      if (!back) errors.push(`edge crossing ${label(o)} dir ${e.dir} (${e.crossing}) is not mirrored`);
    }
    for (const c of h.crossings ?? []) {
      if (!crossingIds.has(c)) errors.push(`hex ${label(o)} refers to unknown crossing ${c}`);
    }
    if (h.terrain === 'bridge' && !h.crossings?.length) errors.push(`bridge hex ${label(o)} has no crossing`);
  }

  // Rivers are continuous barriers: with every bridge and ferry closed, the two hexes of a
  // river edge must not be connected by land, and neither may the two banks of a crossing.
  const closed = components(ix, false);
  const compOf = (o: Offset): number => closed[o.row * cols + o.col] as number;
  const leaks = new Set<string>();
  for (const h of map.hexes) {
    const o = offset(h.col, h.row);
    for (const d of h.riverEdges) {
      const n = ix.neighbourOf(o, d as Direction) as Offset;
      if (compOf(o) >= 0 && compOf(o) === compOf(n)) leaks.add(`${label(o)}–${label(n)}`);
    }
  }
  if (leaks.size > 0) {
    errors.push(
      `river barrier leaks: land path around ${leaks.size} river edge(s): ${[...leaks].slice(0, 10).join(', ')}`,
    );
  }
  for (const c of map.crossings) {
    const [a, b] = c.banks.map(pos) as [Offset, Offset];
    if (compOf(a) >= 0 && compOf(a) === compOf(b)) {
      errors.push(`crossing ${c.id}: banks ${label(a)} and ${label(b)} are connected without it`);
    }
  }

  // Every objective and zone hex exists. Anchors still waiting for a source are warnings.
  for (const a of map.anchors) {
    if (a.todo !== undefined) {
      warnings.push(`${a.kind} ${a.id} has no location yet: ${a.todo}`);
      continue;
    }
    if (!a.hex) {
      errors.push(`${a.kind} ${a.id} has no hex`);
      continue;
    }
    if (!inBounds(pos(a.hex), cols, rows))
      errors.push(`${a.kind} ${a.id} hex ${label(pos(a.hex))} is off the map`);
    if (a.crossing !== undefined && !crossingIds.has(a.crossing)) {
      errors.push(`${a.kind} ${a.id} refers to unknown crossing ${a.crossing}`);
    }
  }

  // The main road is continuous from the south edge over each crossing in `via`, in order.
  const south: Offset[] = [];
  for (let col = 0; col < cols; col++) {
    const o = offset(col, rows - 1);
    if ((ix.at(o) as HexRecord).road) south.push(o);
  }
  if (south.length === 0) errors.push('main road: no road hex on the south edge');
  const via = map.mainRoute.via.map((id) => map.anchors.find((a) => a.id === id)?.crossing ?? id);
  const missing = via.filter((id) => !crossingIds.has(id));
  if (missing.length > 0) {
    errors.push(`main road: waypoint(s) ${missing.join(', ')} are not crossings on the map`);
  } else if (south.length > 0) {
    const reached = routeStages(ix, south, via);
    if (reached < via.length) {
      const done = reached === 0 ? 'the south edge' : (map.mainRoute.via[reached - 1] as string);
      errors.push(`main road: no road path from ${done} over ${map.mainRoute.via[reached] as string}`);
    }
  }

  return { errors, warnings };
}
