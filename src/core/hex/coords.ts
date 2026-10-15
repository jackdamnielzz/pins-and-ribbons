/**
 * Hex coordinates (PLAN 4.2). Pointy-top hexes.
 * Storage uses odd-r offset coordinates (odd rows are shifted half a hex to the right);
 * all maths uses axial coordinates. Row numbers grow downwards (south on the map).
 */

/** Axial coordinates. The implied third cube coordinate is s = -q - r. */
export interface Axial {
  readonly q: number;
  readonly r: number;
}

/** Odd-r offset coordinates, as stored in map files. */
export interface Offset {
  readonly col: number;
  readonly row: number;
}

/**
 * The six directions, in order: east, north-east, north-west, west, south-west, south-east.
 * A direction index (0–5) also names the edge a hex shares with its neighbour in that direction.
 */
export const DIRECTIONS: readonly Axial[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
];

export const DIRECTION_NAMES = ['E', 'NE', 'NW', 'W', 'SW', 'SE'] as const;

export type Direction = 0 | 1 | 2 | 3 | 4 | 5;

/** Turns -0 into 0 so coordinates compare and serialise cleanly. */
function clean(n: number): number {
  return n + 0;
}

export function axial(q: number, r: number): Axial {
  return { q: clean(q), r: clean(r) };
}

export function offset(col: number, row: number): Offset {
  return { col: clean(col), row: clean(row) };
}

export function offsetToAxial(o: Offset): Axial {
  return axial(o.col - (o.row - (o.row & 1)) / 2, o.row);
}

export function axialToOffset(a: Axial): Offset {
  return offset(a.q + (a.r - (a.r & 1)) / 2, a.r);
}

export function axialEquals(a: Axial, b: Axial): boolean {
  return a.q === b.q && a.r === b.r;
}

export function axialAdd(a: Axial, b: Axial): Axial {
  return axial(a.q + b.q, a.r + b.r);
}

/** A stable string key for maps and sets. */
export function axialKey(a: Axial): string {
  return `${a.q},${a.r}`;
}

export function offsetKey(o: Offset): string {
  return `${o.col},${o.row}`;
}

export function oppositeDirection(d: Direction): Direction {
  return ((d + 3) % 6) as Direction;
}

export function neighbour(a: Axial, d: Direction): Axial {
  return axialAdd(a, DIRECTIONS[d] as Axial);
}

/** The six neighbours, in direction order. */
export function neighbours(a: Axial): Axial[] {
  return DIRECTIONS.map((d) => axialAdd(a, d));
}

/** The direction from a to b if they are neighbours, otherwise undefined. */
export function directionTo(a: Axial, b: Axial): Direction | undefined {
  const dq = b.q - a.q;
  const dr = b.r - a.r;
  const index = DIRECTIONS.findIndex((d) => d.q === dq && d.r === dr);
  return index < 0 ? undefined : (index as Direction);
}

/** Number of hex steps between a and b. */
export function distance(a: Axial, b: Axial): number {
  const dq = a.q - b.q;
  const dr = a.r - b.r;
  return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2;
}

/** Rounds fractional axial coordinates to the hex that contains them. */
export function axialRound(q: number, r: number): Axial {
  const s = -q - r;
  let rq = Math.round(q);
  let rr = Math.round(r);
  const rs = Math.round(s);
  const dq = Math.abs(rq - q);
  const dr = Math.abs(rr - r);
  const ds = Math.abs(rs - s);
  if (dq > dr && dq > ds) rq = -rr - rs;
  else if (dr > ds) rr = -rq - rs;
  return axial(rq, rr);
}

/** True if an offset coordinate lies inside a grid of cols × rows. */
export function inBounds(o: Offset, cols: number, rows: number): boolean {
  return o.col >= 0 && o.col < cols && o.row >= 0 && o.row < rows;
}
