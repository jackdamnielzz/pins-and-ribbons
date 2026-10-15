import { describe, expect, it } from 'vitest';
import {
  DIRECTIONS,
  axial,
  axialKey,
  axialRound,
  axialToOffset,
  directionTo,
  distance,
  inBounds,
  neighbour,
  neighbours,
  offset,
  offsetToAxial,
  oppositeDirection,
  type Direction,
} from './coords.ts';

describe('offset and axial conversion (odd-r)', () => {
  it('maps even rows straight across', () => {
    expect(offsetToAxial(offset(0, 0))).toEqual(axial(0, 0));
    expect(offsetToAxial(offset(3, 0))).toEqual(axial(3, 0));
    expect(offsetToAxial(offset(3, 2))).toEqual(axial(2, 2));
  });

  it('shifts odd rows', () => {
    expect(offsetToAxial(offset(0, 1))).toEqual(axial(0, 1));
    expect(offsetToAxial(offset(2, 3))).toEqual(axial(1, 3));
  });

  it('round-trips every hex of a grid, including negative rows', () => {
    for (let row = -5; row <= 5; row++) {
      for (let col = -5; col <= 5; col++) {
        const o = offset(col, row);
        expect(axialToOffset(offsetToAxial(o))).toEqual(o);
      }
    }
  });

  it('never produces negative zero', () => {
    expect(Object.is(offsetToAxial(offset(0, 0)).q, -0)).toBe(false);
    expect(Object.is(axialToOffset(axial(0, 0)).col, -0)).toBe(false);
  });
});

describe('neighbours', () => {
  it('returns six distinct hexes at distance 1, in direction order', () => {
    const centre = axial(2, -1);
    const ring = neighbours(centre);
    expect(ring).toHaveLength(6);
    expect(new Set(ring.map(axialKey)).size).toBe(6);
    ring.forEach((n, i) => {
      expect(distance(centre, n)).toBe(1);
      expect(n).toEqual(neighbour(centre, i as Direction));
    });
  });

  it('matches the odd-r neighbours of an even and an odd row', () => {
    // Even row (row 2): the hexes above and below sit to the upper-left and lower-left.
    const even = neighbours(offsetToAxial(offset(3, 2))).map(axialToOffset);
    expect(even).toEqual([
      offset(4, 2),
      offset(3, 1),
      offset(2, 1),
      offset(2, 2),
      offset(2, 3),
      offset(3, 3),
    ]);
    // Odd row (row 3): they sit to the upper-right and lower-right.
    const odd = neighbours(offsetToAxial(offset(3, 3))).map(axialToOffset);
    expect(odd).toEqual([offset(4, 3), offset(4, 2), offset(3, 2), offset(2, 3), offset(3, 4), offset(4, 4)]);
  });

  it('finds the direction between neighbours and nothing for others', () => {
    const a = axial(0, 0);
    DIRECTIONS.forEach((_, i) => {
      const d = i as Direction;
      expect(directionTo(a, neighbour(a, d))).toBe(d);
      expect(directionTo(neighbour(a, d), a)).toBe(oppositeDirection(d));
    });
    expect(directionTo(a, axial(2, 0))).toBeUndefined();
    expect(directionTo(a, a)).toBeUndefined();
  });

  it('pairs each direction with its opposite', () => {
    for (let d = 0; d < 6; d++) {
      const o = oppositeDirection(d as Direction);
      expect(DIRECTIONS[o]).toEqual(axial(-(DIRECTIONS[d]?.q ?? 0), -(DIRECTIONS[d]?.r ?? 0)));
    }
  });
});

describe('distance', () => {
  it('is zero to itself and symmetric', () => {
    const a = axial(3, -7);
    const b = axial(-2, 4);
    expect(distance(a, a)).toBe(0);
    expect(distance(a, b)).toBe(distance(b, a));
  });

  it('counts steps along each axis and diagonally', () => {
    expect(distance(axial(0, 0), axial(5, 0))).toBe(5);
    expect(distance(axial(0, 0), axial(0, -4))).toBe(4);
    expect(distance(axial(0, 0), axial(3, -3))).toBe(3);
    expect(distance(axial(0, 0), axial(2, 3))).toBe(5);
  });

  it('agrees with odd-r offset positions', () => {
    // (0,0) to (0,2) is two rows down: two steps.
    expect(distance(offsetToAxial(offset(0, 0)), offsetToAxial(offset(0, 2)))).toBe(2);
    // (0,0) to (5,1): five steps east, one of them diagonal.
    expect(distance(offsetToAxial(offset(0, 0)), offsetToAxial(offset(5, 1)))).toBe(6);
  });
});

describe('axialRound', () => {
  it('keeps whole coordinates', () => {
    expect(axialRound(2, -3)).toEqual(axial(2, -3));
  });

  it('rounds to the nearest hex', () => {
    expect(axialRound(0.1, 0.1)).toEqual(axial(0, 0));
    expect(axialRound(0.9, -0.1)).toEqual(axial(1, 0));
    expect(axialRound(-0.4, 0.45)).toEqual(axial(0, 0));
    expect(axialRound(-0.6, 0.7)).toEqual(axial(-1, 1));
  });
});

describe('inBounds', () => {
  it('accepts the grid and rejects outside hexes', () => {
    expect(inBounds(offset(0, 0), 3, 2)).toBe(true);
    expect(inBounds(offset(2, 1), 3, 2)).toBe(true);
    expect(inBounds(offset(3, 1), 3, 2)).toBe(false);
    expect(inBounds(offset(0, 2), 3, 2)).toBe(false);
    expect(inBounds(offset(-1, 0), 3, 2)).toBe(false);
  });
});
