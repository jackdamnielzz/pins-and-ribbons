import { describe, expect, it } from 'vitest';
import { axial, axialEquals, axialKey, distance, type Axial } from './coords.ts';
import { hasLineOfSight, hexLine } from './line.ts';

describe('hexLine', () => {
  it('is a single hex for a line to itself', () => {
    expect(hexLine(axial(2, 2), axial(2, 2))).toEqual([axial(2, 2)]);
  });

  it('runs straight along an axis', () => {
    expect(hexLine(axial(0, 0), axial(3, 0))).toEqual([axial(0, 0), axial(1, 0), axial(2, 0), axial(3, 0)]);
  });

  it('has distance + 1 hexes, each a neighbour of the last, from a to b', () => {
    const a = axial(-3, 1);
    const b = axial(4, -5);
    const line = hexLine(a, b);
    expect(line).toHaveLength(distance(a, b) + 1);
    expect(line[0]).toEqual(a);
    expect(line.at(-1)).toEqual(b);
    for (let i = 1; i < line.length; i++) {
      expect(distance(line[i - 1] as Axial, line[i] as Axial)).toBe(1);
    }
  });

  it('picks one side consistently when the line runs along an edge', () => {
    // (0,0) to (1,1) passes exactly between (1,0) and (0,1).
    const line = hexLine(axial(0, 0), axial(1, 1));
    expect(line).toHaveLength(3);
    const middle = line[1] as Axial;
    expect([axialKey(axial(1, 0)), axialKey(axial(0, 1))]).toContain(axialKey(middle));
  });
});

describe('hasLineOfSight', () => {
  const blockers = (...hexes: Axial[]) => {
    const set = new Set(hexes.map(axialKey));
    return (h: Axial): boolean => set.has(axialKey(h));
  };

  it('is clear over open ground', () => {
    expect(hasLineOfSight(axial(0, 0), axial(5, 0), () => false)).toBe(true);
  });

  it('is blocked by a hex in between', () => {
    expect(hasLineOfSight(axial(0, 0), axial(4, 0), blockers(axial(2, 0)))).toBe(false);
  });

  it('ignores blocking terrain in the end hexes', () => {
    const blocks = blockers(axial(0, 0), axial(3, 0));
    expect(hasLineOfSight(axial(0, 0), axial(3, 0), blocks)).toBe(true);
  });

  it('is always clear to a neighbour', () => {
    expect(hasLineOfSight(axial(0, 0), axial(1, 0), () => true)).toBe(true);
  });

  it('looks past a blocker on one side of an edge-running line', () => {
    const a = axial(0, 0);
    const b = axial(1, 1);
    expect(hasLineOfSight(a, b, blockers(axial(1, 0)))).toBe(true);
    expect(hasLineOfSight(a, b, blockers(axial(0, 1)))).toBe(true);
    expect(hasLineOfSight(a, b, blockers(axial(1, 0), axial(0, 1)))).toBe(false);
  });

  it('is symmetric', () => {
    const blocks = blockers(axial(1, -1), axial(2, 1), axial(-1, 2));
    const hexes = [axial(0, 0), axial(3, -2), axial(4, 1), axial(-2, 3), axial(2, 2)];
    for (const a of hexes) {
      for (const b of hexes) {
        if (axialEquals(a, b)) continue;
        expect(hasLineOfSight(a, b, blocks)).toBe(hasLineOfSight(b, a, blocks));
      }
    }
  });
});
