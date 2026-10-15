/** Plain 2D geometry helpers for the map generator. Coordinates are map kilometres unless noted. */

export interface Pt {
  x: number;
  y: number;
}

export type Ring = Pt[];

function cross(o: Pt, a: Pt, b: Pt): number {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

/** The point where segments ab and cd meet (endpoints included), or undefined. */
export function segmentIntersection(a: Pt, b: Pt, c: Pt, d: Pt): Pt | undefined {
  const rx = b.x - a.x;
  const ry = b.y - a.y;
  const sx = d.x - c.x;
  const sy = d.y - c.y;
  const denom = rx * sy - ry * sx;
  if (denom === 0) {
    // Parallel. Collinear overlaps are treated as touching at the first shared point.
    if (cross(a, b, c) !== 0) return undefined;
    for (const p of [c, d]) if (onSegment(a, b, p)) return p;
    for (const p of [a, b]) if (onSegment(c, d, p)) return p;
    return undefined;
  }
  const t = ((c.x - a.x) * sy - (c.y - a.y) * sx) / denom;
  const u = ((c.x - a.x) * ry - (c.y - a.y) * rx) / denom;
  if (t < 0 || t > 1 || u < 0 || u > 1) return undefined;
  return { x: a.x + t * rx, y: a.y + t * ry };
}

function onSegment(a: Pt, b: Pt, p: Pt): boolean {
  return (
    Math.min(a.x, b.x) <= p.x &&
    p.x <= Math.max(a.x, b.x) &&
    Math.min(a.y, b.y) <= p.y &&
    p.y <= Math.max(a.y, b.y)
  );
}

/** All points where segment ab crosses a polyline. */
export function crossings(a: Pt, b: Pt, line: Pt[]): Pt[] {
  const out: Pt[] = [];
  for (let i = 1; i < line.length; i++) {
    const p = segmentIntersection(a, b, line[i - 1] as Pt, line[i] as Pt);
    if (p) out.push(p);
  }
  return out;
}

export interface Box {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export function boundsOf(points: Pt[]): Box {
  const box = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  for (const p of points) {
    box.minX = Math.min(box.minX, p.x);
    box.minY = Math.min(box.minY, p.y);
    box.maxX = Math.max(box.maxX, p.x);
    box.maxY = Math.max(box.maxY, p.y);
  }
  return box;
}

export function boxesOverlap(a: Box, b: Box): boolean {
  return a.minX <= b.maxX && b.minX <= a.maxX && a.minY <= b.maxY && b.minY <= a.maxY;
}

/** Even-odd point-in-polygon test over all rings (outer rings and holes alike). */
export function pointInRings(p: Pt, rings: Ring[]): boolean {
  let inside = false;
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const a = ring[i] as Pt;
      const b = ring[j] as Pt;
      if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
    }
  }
  return inside;
}

/** Points every `step` along a polyline, always including both ends. */
export function samplePolyline(line: Pt[], step: number): Pt[] {
  if (line.length === 0) return [];
  const out: Pt[] = [line[0] as Pt];
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1] as Pt;
    const b = line[i] as Pt;
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const n = Math.max(1, Math.ceil(len / step));
    for (let k = 1; k <= n; k++) out.push({ x: a.x + ((b.x - a.x) * k) / n, y: a.y + ((b.y - a.y) * k) / n });
  }
  return out;
}

function perpendicularDistance(p: Pt, a: Pt, b: Pt): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  return Math.abs(dx * (a.y - p.y) - dy * (a.x - p.x)) / len;
}

/** Douglas–Peucker simplification (PLAN 9 step 5). Keeps both end points. */
export function simplify(points: Pt[], tolerance: number): Pt[] {
  if (points.length <= 2) return points.slice();
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack: [number, number][] = [[0, points.length - 1]];
  while (stack.length > 0) {
    const [first, last] = stack.pop() as [number, number];
    let maxDist = 0;
    let index = -1;
    for (let i = first + 1; i < last; i++) {
      const d = perpendicularDistance(points[i] as Pt, points[first] as Pt, points[last] as Pt);
      if (d > maxDist) {
        maxDist = d;
        index = i;
      }
    }
    if (index >= 0 && maxDist > tolerance) {
      keep[index] = 1;
      stack.push([first, index], [index, last]);
    }
  }
  return points.filter((_, i) => keep[i] === 1);
}

/** Simplifies a closed ring; returns undefined if it collapses below a triangle. */
export function simplifyRing(ring: Ring, tolerance: number): Ring | undefined {
  if (ring.length < 4) return undefined;
  // Split at the point farthest from the start so a closed ring keeps its shape.
  const start = ring[0] as Pt;
  let far = 0;
  let farDist = -1;
  ring.forEach((p, i) => {
    const d = Math.hypot(p.x - start.x, p.y - start.y);
    if (d > farDist) {
      farDist = d;
      far = i;
    }
  });
  const a = simplify(ring.slice(0, far + 1), tolerance);
  const b = simplify(ring.slice(far), tolerance);
  const out = [...a, ...b.slice(1)];
  return out.length >= 4 ? out : undefined;
}

export function ringArea(ring: Ring): number {
  let sum = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i] as Pt;
    const b = ring[j] as Pt;
    sum += (b.x - a.x) * (b.y + a.y);
  }
  return Math.abs(sum) / 2;
}

/**
 * Joins open line pieces that share end points into closed rings (for OSM multipolygons).
 * Pieces that cannot be closed are closed with a straight segment and counted in `forced`.
 */
export function stitchRings<P extends { x: number; y: number }>(
  pieces: P[][],
): { rings: P[][]; forced: number } {
  const same = (a: P, b: P): boolean => a.x === b.x && a.y === b.y;
  const open = pieces.filter((p) => p.length >= 2).map((p) => p.slice());
  const rings: P[][] = [];
  let forced = 0;
  while (open.length > 0) {
    let ring = open.shift() as P[];
    let grown = true;
    while (!same(ring[0] as P, ring.at(-1) as P) && grown) {
      grown = false;
      const end = ring.at(-1) as P;
      for (let i = 0; i < open.length; i++) {
        const piece = open[i] as P[];
        if (same(piece[0] as P, end)) ring = ring.concat(piece.slice(1));
        else if (same(piece.at(-1) as P, end)) ring = ring.concat(piece.slice(0, -1).reverse());
        else continue;
        open.splice(i, 1);
        grown = true;
        break;
      }
    }
    if (!same(ring[0] as P, ring.at(-1) as P)) {
      forced++;
      ring.push(ring[0] as P);
    }
    if (ring.length >= 4) rings.push(ring);
  }
  return { rings, forced };
}

/** Sutherland–Hodgman clip of a ring to an axis-aligned box. May return undefined if nothing is left. */
export function clipRing(ring: Ring, box: Box): Ring | undefined {
  type Side = { inside: (p: Pt) => boolean; cut: (a: Pt, b: Pt) => Pt };
  const atX =
    (x: number) =>
    (a: Pt, b: Pt): Pt => ({ x, y: a.y + ((b.y - a.y) * (x - a.x)) / (b.x - a.x) });
  const atY =
    (y: number) =>
    (a: Pt, b: Pt): Pt => ({ x: a.x + ((b.x - a.x) * (y - a.y)) / (b.y - a.y), y });
  const sides: Side[] = [
    { inside: (p) => p.x >= box.minX, cut: atX(box.minX) },
    { inside: (p) => p.x <= box.maxX, cut: atX(box.maxX) },
    { inside: (p) => p.y >= box.minY, cut: atY(box.minY) },
    { inside: (p) => p.y <= box.maxY, cut: atY(box.maxY) },
  ];
  let points = ring.slice(0, -1);
  for (const side of sides) {
    if (points.length === 0) break;
    const input = points;
    points = [];
    for (let i = 0; i < input.length; i++) {
      const cur = input[i] as Pt;
      const prev = input[(i + input.length - 1) % input.length] as Pt;
      if (side.inside(cur)) {
        if (!side.inside(prev)) points.push(side.cut(prev, cur));
        points.push(cur);
      } else if (side.inside(prev)) {
        points.push(side.cut(prev, cur));
      }
    }
  }
  if (points.length < 3) return undefined;
  return [...points, points[0] as Pt];
}

/** Clips a polyline to a box, splitting it where it leaves and re-enters (Liang–Barsky). */
export function clipLine(line: Pt[], box: Box): Pt[][] {
  const out: Pt[][] = [];
  let current: Pt[] = [];
  const flush = (): void => {
    if (current.length >= 2) out.push(current);
    current = [];
  };
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1] as Pt;
    const b = line[i] as Pt;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    let t0 = 0;
    let t1 = 1;
    const tests: [number, number][] = [
      [-dx, a.x - box.minX],
      [dx, box.maxX - a.x],
      [-dy, a.y - box.minY],
      [dy, box.maxY - a.y],
    ];
    let visible = true;
    for (const [p, q] of tests) {
      if (p === 0) {
        if (q < 0) visible = false;
      } else {
        const t = q / p;
        if (p < 0) t0 = Math.max(t0, t);
        else t1 = Math.min(t1, t);
      }
    }
    if (!visible || t0 > t1) {
      flush();
      continue;
    }
    const start = { x: a.x + t0 * dx, y: a.y + t0 * dy };
    const end = { x: a.x + t1 * dx, y: a.y + t1 * dy };
    const last = current.at(-1);
    if (!last || last.x !== start.x || last.y !== start.y) {
      flush();
      current.push(start);
    }
    current.push(end);
    if (t1 < 1) flush();
  }
  flush();
  return out;
}
