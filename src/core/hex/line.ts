import { axialEquals, axialKey, axialRound, distance, type Axial } from './coords.ts';

/** Nudge that keeps a line off the exact edge between two hexes. */
const NUDGE = 1e-6;

function lineWithNudge(a: Axial, b: Axial, nudge: number): Axial[] {
  const n = distance(a, b);
  if (n === 0) return [a];
  const aq = a.q + nudge;
  const ar = a.r + nudge;
  const bq = b.q + nudge;
  const br = b.r + nudge;
  const out: Axial[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    out.push(axialRound(aq + (bq - aq) * t, ar + (br - ar) * t));
  }
  return out;
}

/**
 * The hexes a straight line from the centre of a to the centre of b passes through,
 * from a to b inclusive. Where the line runs exactly along an edge, it takes one side.
 */
export function hexLine(a: Axial, b: Axial): Axial[] {
  return lineWithNudge(a, b, NUDGE);
}

/**
 * Line of sight between two hex centres. `blocks` decides whether a hex blocks sight;
 * the two end hexes never block. A line that runs exactly along an edge is checked on
 * both sides and is clear if either side is clear.
 */
export function hasLineOfSight(a: Axial, b: Axial, blocks: (h: Axial) => boolean): boolean {
  const clear = (line: Axial[]): boolean =>
    line.every((h) => axialEquals(h, a) || axialEquals(h, b) || !blocks(h));
  const left = lineWithNudge(a, b, NUDGE);
  if (clear(left)) return true;
  const right = lineWithNudge(a, b, -NUDGE);
  const differs = right.some((h, i) => axialKey(h) !== axialKey(left[i] as Axial));
  return differs && clear(right);
}
