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
import {
  CROSSING_STATES,
  TERRAINS,
  type HexMap,
  type HexPos,
  type HexRecord,
} from '../../src/core/map/types.ts';

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

/** The crossings that are intact at the start of the scenario, and so can be used. */
function usableIds(map: HexMap): Set<string> {
  return new Set(map.crossings.filter((c) => c.state === 'intact').map((c) => c.id));
}

/** Whether a unit can be in this hex. Bridge and water hexes need an `open` crossing. */
function standable(h: HexRecord, open: Set<string>): boolean {
  if (h.terrain !== 'river' && h.terrain !== 'bridge') return true;
  return (h.crossings ?? []).some((c) => open.has(c));
}

/** Whether a unit could step from hex o in direction d, using only the `open` crossings. */
function canStep(ix: MapIndex, o: Offset, d: Direction, open: Set<string>): Offset | undefined {
  const n = ix.neighbourOf(o, d);
  if (!n) return undefined;
  const from = ix.at(o) as HexRecord;
  const to = ix.at(n) as HexRecord;
  if (!standable(to, open)) return undefined;
  if (from.riverEdges.includes(d) && !from.edgeCrossings.some((e) => e.dir === d && open.has(e.crossing))) {
    return undefined;
  }
  return n;
}

/** Connected land components; -1 for hexes nothing can stand on. */
function components(ix: MapIndex, open: Set<string>): Int32Array {
  const { cols, rows } = ix.map.grid;
  const comp = new Int32Array(cols * rows).fill(-1);
  let next = 0;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const start = offset(col, row);
      const h = ix.at(start) as HexRecord;
      if (!standable(h, open) || (comp[row * cols + col] as number) >= 0) continue;
      const id = next++;
      comp[row * cols + col] = id;
      const queue = [start];
      while (queue.length > 0) {
        const o = queue.pop() as Offset;
        for (let d = 0; d < 6; d++) {
          const n = canStep(ix, o, d as Direction, open);
          if (!n || (comp[n.row * cols + n.col] as number) >= 0) continue;
          comp[n.row * cols + n.col] = id;
          queue.push(n);
        }
      }
    }
  }
  return comp;
}

const pos = (p: HexPos): Offset => offset(p[0], p[1]);
const label = (o: Offset): string => `[${o.col},${o.row}]`;

/** One stop of the main route: a crossing to use or a hex to pass through. */
type RouteTarget = { crossing: string } | { hex: Offset };

export interface RouteResult {
  /** How many targets the best path reached in order (all of them when complete). */
  reached: number;
  /** The shortest complete path, from the south edge to the last target. */
  path: Offset[];
  problem?: string;
}

/**
 * Shortest road path from any of `starts` through every target in order. Steps go between
 * road hexes (or bridge and ferry hexes) over usable crossings only. A crossing target is
 * reached by stepping over an edge that carries it or into a hex it runs through.
 */
function routeThrough(ix: MapIndex, starts: Offset[], targets: RouteTarget[]): RouteResult {
  const { cols, rows } = ix.map.grid;
  const size = cols * rows;
  const open = usableIds(ix.map);
  const key = (o: Offset, stage: number): number => stage * size + o.row * cols + o.col;
  const reach = (o: Offset, stage: number): number => {
    const t = targets[stage];
    return t && 'hex' in t && t.hex.col === o.col && t.hex.row === o.row ? stage + 1 : stage;
  };
  const prev = new Map<number, number>();
  const queue: [Offset, number][] = [];
  let best = 0;
  for (const s0 of starts) {
    const stage = reach(s0, 0);
    if (prev.has(key(s0, stage))) continue;
    prev.set(key(s0, stage), -1);
    queue.push([s0, stage]);
  }
  for (let head = 0; head < queue.length; head++) {
    const [o, stage] = queue[head] as [Offset, number];
    best = Math.max(best, stage);
    if (stage === targets.length) {
      const path: Offset[] = [];
      for (let k = key(o, stage); k !== -1; k = prev.get(k) as number) {
        const cell = k % size;
        const p = offset(cell % cols, Math.floor(cell / cols));
        const last = path.at(-1);
        if (!last || last.col !== p.col || last.row !== p.row) path.push(p);
      }
      return { reached: stage, path: path.reverse() };
    }
    const from = ix.at(o) as HexRecord;
    const t = targets[stage] as RouteTarget;
    for (let d = 0; d < 6; d++) {
      const n = canStep(ix, o, d as Direction, open);
      if (!n) continue;
      const to = ix.at(n) as HexRecord;
      if (!to.road && !to.crossings?.length) continue;
      const uses =
        'crossing' in t &&
        (from.edgeCrossings.some((e) => e.dir === d && e.crossing === t.crossing) ||
          (to.crossings ?? []).includes(t.crossing));
      const next = reach(n, uses ? stage + 1 : stage);
      if (prev.has(key(n, next))) continue;
      prev.set(key(n, next), key(o, stage));
      queue.push([n, next]);
    }
  }
  return { reached: best, path: [] };
}

/** The main route of a map as described by `mainRoute.via`, or why it cannot be found. */
export function findMainRoute(map: HexMap): RouteResult {
  const { cols, rows } = map.grid;
  if (map.hexes.length !== cols * rows) return { reached: 0, path: [], problem: 'the grid is incomplete' };
  const ix = indexMap(map);
  const south: Offset[] = [];
  for (let col = 0; col < cols; col++) {
    const o = offset(col, rows - 1);
    if ((ix.at(o) as HexRecord).road) south.push(o);
  }
  if (south.length === 0) return { reached: 0, path: [], problem: 'no road hex on the south edge' };
  const targets: RouteTarget[] = [];
  const missing: string[] = [];
  for (const id of map.mainRoute.via) {
    const anchor = map.anchors.find((a) => a.id === id);
    const crossing = anchor?.crossing ?? (map.crossings.some((c) => c.id === id) ? id : undefined);
    if (crossing) targets.push({ crossing });
    else if (anchor?.hex) targets.push({ hex: pos(anchor.hex) });
    else missing.push(id);
  }
  if (missing.length > 0) {
    return { reached: 0, path: [], problem: `waypoint(s) ${missing.join(', ')} are not on the map` };
  }
  return routeThrough(ix, south, targets);
}

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
  for (const c of map.crossings) {
    if (!CROSSING_STATES.includes(c.state)) errors.push(`crossing ${c.id} has unknown state ${c.state}`);
    if (!c.source.trim()) errors.push(`crossing ${c.id} has no source`);
  }
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
  const closed = components(ix, new Set());
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

  // The main road runs from the south edge through each waypoint in `via`, in order, over
  // crossings that are intact at the start, and the stored route is that road.
  const route = findMainRoute(map);
  if (route.problem) {
    errors.push(`main road: ${route.problem}`);
  } else if (route.reached < map.mainRoute.via.length) {
    const done = route.reached === 0 ? 'the south edge' : (map.mainRoute.via[route.reached - 1] as string);
    errors.push(`main road: no road path from ${done} to ${map.mainRoute.via[route.reached] as string}`);
  } else if (JSON.stringify(route.path.map((o) => [o.col, o.row])) !== JSON.stringify(map.mainRoute.hexes)) {
    errors.push('main road: mainRoute.hexes does not match the road found over the waypoints');
  }

  return { errors, warnings };
}
