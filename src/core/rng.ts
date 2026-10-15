/**
 * Seeded pseudo-random number generator (mulberry32).
 * The only source of randomness allowed in src/core and src/ai (PLAN 8.3).
 * The state is a plain object so it can be saved and restored with the game state.
 */
export interface RngState {
  s: number;
}

export function createRng(seed: number): RngState {
  return { s: seed >>> 0 };
}

/** Returns a float in [0, 1) and advances the state. */
export function nextFloat(rng: RngState): number {
  rng.s = (rng.s + 0x6d2b79f5) >>> 0;
  let t = rng.s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Returns an integer in [min, maxExclusive) and advances the state. */
export function nextInt(rng: RngState, min: number, maxExclusive: number): number {
  if (!(maxExclusive > min)) {
    throw new RangeError(`nextInt: empty range [${min}, ${maxExclusive})`);
  }
  return min + Math.floor(nextFloat(rng) * (maxExclusive - min));
}
