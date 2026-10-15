import { describe, expect, it } from 'vitest';
import { offset } from '../../src/core/hex/index.ts';
import {
  COVER_CLASSES,
  centreOf,
  coverShares,
  findCrossingPoints,
  hexAt,
  hexesOnLine,
  indexLines,
  makeGrid,
  manualCandidate,
  markRiverEdges,
  orderBanks,
  placeCrossings,
  terrainFor,
  type CrossingCandidate,
} from './classify.ts';
import type { Pt } from './geometry.ts';
import type { HexRecord } from './map-types.ts';
import { validateMap } from './validate.ts';
import { blankHexes, mapOf } from './test-maps.ts';

const p = (x: number, y: number): Pt => ({ x, y });
const withMeta = (c: CrossingCandidate, id: string): CrossingCandidate => ({
  ...c,
  meta: { id, name: c.name, state: 'intact', source: 's' },
});
const share = (shares: Float64Array, c: (typeof COVER_CLASSES)[number]): number =>
  shares[COVER_CLASSES.indexOf(c)] as number;

describe('grid', () => {
  it('measures the map from the hex layout', () => {
    const grid = makeGrid(25, 40, 1);
    expect(grid.widthKm).toBeCloseTo(25.5);
    expect(grid.heightKm).toBeCloseTo((1 / Math.sqrt(3)) * 60.5);
  });

  it('finds the hex under each hex centre and nothing off the map', () => {
    const grid = makeGrid(5, 4, 1);
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 5; col++)
        expect(hexAt(grid, centreOf(grid, offset(col, row)))).toEqual(offset(col, row));
    }
    expect(hexAt(grid, p(-1, 1))).toBeUndefined();
    expect(hexAt(grid, p(1, 100))).toBeUndefined();
  });

  it('lists the hexes a line passes through, in order', () => {
    const grid = makeGrid(5, 1, 1);
    const hexes = hexesOnLine(grid, [p(0.5, 0.577), p(4.5, 0.577)]);
    expect(hexes).toEqual([0, 1, 2, 3, 4].map((c) => offset(c, 0)));
  });
});

describe('coverShares', () => {
  const grid = makeGrid(4, 4, 1);

  it('fills polygons and counts shares per hex', () => {
    const all = [p(-1, -1), p(10, -1), p(10, 10), p(-1, 10), p(-1, -1)];
    const shares = coverShares(grid, [{ cover: 'woodland', rings: [all] }], 0.05);
    for (const s of shares) expect(share(s, 'woodland')).toBeCloseTo(1);
  });

  it('leaves holes empty (even-odd fill)', () => {
    const outer = [p(-1, -1), p(10, -1), p(10, 10), p(-1, 10), p(-1, -1)];
    const hole = [p(0, 0), p(10, 0), p(10, 10), p(0, 10), p(0, 0)];
    const shares = coverShares(grid, [{ cover: 'heath', rings: [outer, hole] }], 0.05);
    for (const s of shares) expect(share(s, 'heath')).toBe(0);
  });

  it('lets the higher-priority class win where polygons overlap', () => {
    const all = [p(-1, -1), p(10, -1), p(10, 10), p(-1, 10), p(-1, -1)];
    const shares = coverShares(
      grid,
      [
        { cover: 'built-up', rings: [all] },
        { cover: 'woodland', rings: [all] },
      ],
      0.05,
    );
    for (const s of shares) expect(share(s, 'built-up')).toBeCloseTo(1);
  });
});

describe('terrainFor', () => {
  const options = {
    minShare: { river: 0.5, 'built-up': 0.3, woodland: 0.45, heath: 0.35 },
    polderMaxElevationM: 14,
  };
  const none = {
    footprintShare: 0,
    minFootprintShare: 0.02,
    coreShare: 0,
    coreMinShare: 0.5,
    heathShare: 0,
    heathMinShare: 0.5,
  };
  const shares = (s: Partial<Record<(typeof COVER_CLASSES)[number], number>>): Float64Array =>
    Float64Array.from(COVER_CLASSES.map((c) => s[c] ?? 0));

  it('makes a hex built-up from 1944 building footprints or a core mask, not from today', () => {
    expect(terrainFor(shares({ 'built-up': 0.9 }), 20, options, none)).toBe('open');
    expect(terrainFor(shares({ woodland: 0.6 }), 20, options, { ...none, footprintShare: 0.02 })).toBe(
      'built-up',
    );
    expect(terrainFor(shares({ none: 1 }), 5, options, { ...none, coreShare: 0.5 })).toBe('built-up');
    expect(terrainFor(shares({ none: 1 }), 5, options, { ...none, footprintShare: 0.019 })).toBe('polder');
  });

  it('applies the priority river > built-up > 1944 heath > woodland > heath', () => {
    const builtUp = { ...none, footprintShare: 0.5 };
    expect(terrainFor(shares({ river: 0.5 }), 5, options, builtUp)).toBe('river');
    expect(terrainFor(shares({ woodland: 0.9 }), 20, options, { ...none, heathShare: 0.5 })).toBe('heath');
    expect(terrainFor(shares({ woodland: 0.9 }), 20, options, { ...builtUp, heathShare: 1 })).toBe(
      'built-up',
    );
    expect(terrainFor(shares({ woodland: 0.45, heath: 0.55 }), 20, options, none)).toBe('woodland');
  });

  it('falls back to the largest class when none reaches its minimum', () => {
    expect(terrainFor(shares({ heath: 0.34, woodland: 0.2, none: 0.3 }), 20, options, none)).toBe('heath');
  });

  it('makes bare land polder when low and open fields when higher', () => {
    expect(terrainFor(shares({ none: 1 }), 9, options, none)).toBe('polder');
    expect(terrainFor(shares({ none: 1 }), 30, options, none)).toBe('open');
  });
});

describe('rivers and crossings', () => {
  // A 6 × 6 map with a river running west to east between rows 2 and 3, and a road
  // running north to south across it on a bridge.
  const grid = makeGrid(6, 6, 1);
  const riverY = (centreOf(grid, offset(0, 2)).y + centreOf(grid, offset(0, 3)).y) / 2;
  const river = indexLines([{ name: 'Rhine', line: [p(-1, riverY), p(10, riverY)] }]);
  // Slightly east of the column-2 centres, so the road never runs exactly along a hex edge.
  const roadX = centreOf(grid, offset(2, 0)).x + 0.1;
  const road = [p(roadX, 0), p(roadX, grid.heightKm)];

  const build = (): HexRecord[] => {
    const hexes = blankHexes(6, 6);
    for (const o of hexesOnLine(grid, road)) (hexes[o.row * 6 + o.col] as HexRecord).road = true;
    return hexes;
  };

  it('marks a continuous barrier of mirrored river edges', () => {
    const hexes = build();
    const edgeRivers = markRiverEdges(grid, hexes, river);
    expect(edgeRivers.size).toBeGreaterThan(0);
    for (const [, names] of edgeRivers) expect(names).toEqual(['Rhine']);
    const map = mapOf(6, 6, hexes);
    expect(validateMap(map).errors).toEqual([]);
    // Every hex north of the river has river edges only towards the south.
    for (const h of hexes.filter((x) => x.row === 2))
      expect(h.riverEdges.every((d) => d === 4 || d === 5)).toBe(true);
  });

  it('places a bridge on the river edge the road crosses', () => {
    const hexes = build();
    const edgeRivers = markRiverEdges(grid, hexes, river);
    const candidates = findCrossingPoints(
      [{ kind: 'road', name: 'Test Bridge', osmId: 'way/1', line: road }],
      river,
    ).map((c) => withMeta(c, 'road-test-bridge'));
    expect(candidates).toHaveLength(1);
    const crossings = placeCrossings(grid, hexes, edgeRivers, river, candidates, 1);
    expect(crossings).toHaveLength(1);
    const c = crossings[0];
    expect(c).toMatchObject({
      id: 'road-test-bridge',
      kind: 'road',
      river: 'Rhine',
      state: 'intact',
      source: 's',
    });
    // North bank first.
    expect(c?.banks[0][1]).toBe(2);
    expect(c?.banks[1][1]).toBe(3);
    const map = mapOf(6, 6, hexes, crossings, ['road-test-bridge']);
    expect(validateMap(map).errors).toEqual([]);
  });

  it('merges both carriageways of one bridge into a single crossing', () => {
    const hexes = build();
    const edgeRivers = markRiverEdges(grid, hexes, river);
    const lines = [
      { kind: 'road' as const, name: 'Twin', osmId: 'way/1', line: road },
      {
        kind: 'road' as const,
        name: 'Twin',
        osmId: 'way/2',
        line: road.map((q) => p(q.x + 0.02, q.y)).reverse(),
      },
    ];
    const candidates = findCrossingPoints(lines, river).map((c) => withMeta(c, 'twin'));
    const crossings = placeCrossings(grid, hexes, edgeRivers, river, candidates, 1);
    expect(crossings.map((c) => c.id)).toEqual(['twin']);
  });

  it('skips crossings without a sourced spec', () => {
    const hexes = build();
    const edgeRivers = markRiverEdges(grid, hexes, river);
    const candidates = findCrossingPoints([{ kind: 'road', name: 'Modern', line: road }], river);
    expect(placeCrossings(grid, hexes, edgeRivers, river, candidates, 1)).toEqual([]);
    expect(hexes.every((h) => h.edgeCrossings.length === 0)).toBe(true);
  });

  it('places a crossing that is not in OpenStreetMap across the nearest river', () => {
    const hexes = build();
    const edgeRivers = markRiverEdges(grid, hexes, river);
    const at = p(centreOf(grid, offset(4, 2)).x, riverY);
    const c = manualCandidate(at, 'Rhine', river, 'pontoon', {
      id: 'pontoon',
      name: 'P',
      state: 'damaged',
      source: 's',
    });
    expect(c?.axis.x).toBeCloseTo(0);
    const crossings = placeCrossings(grid, hexes, edgeRivers, river, c ? [c] : [], 1);
    expect(crossings).toMatchObject([{ id: 'pontoon', kind: 'pontoon', state: 'damaged' }]);
    expect(crossings[0]?.banks[0][1]).toBe(2);
  });

  it('keeps a road and a rail bridge on the same edge apart', () => {
    const hexes = build();
    const edgeRivers = markRiverEdges(grid, hexes, river);
    const lines = [
      { kind: 'road' as const, name: 'Road', osmId: 'way/1', line: road },
      { kind: 'rail' as const, name: 'Rail', osmId: 'way/2', line: road.map((q) => p(q.x + 0.05, q.y)) },
    ];
    const candidates = findCrossingPoints(lines, river).map((c) => withMeta(c, c.kind));
    const crossings = placeCrossings(grid, hexes, edgeRivers, river, candidates, 1);
    expect(crossings.map((c) => c.id).sort()).toEqual(['rail', 'road']);
    const edge = hexes.flatMap((h) => h.edgeCrossings);
    expect(new Set(edge.map((e) => e.crossing))).toEqual(new Set(['rail', 'road']));
  });
});

describe('orderBanks', () => {
  const grid = makeGrid(4, 4, 1);
  const a = centreOf(grid, offset(1, 1));
  const b = centreOf(grid, offset(2, 1));
  const at = p((a.x + b.x) / 2, a.y);

  it('puts the west bank first where a river runs north-south, whichever way it flows', () => {
    expect(
      orderBanks(
        grid,
        [
          [2, 1],
          [1, 1],
        ],
        at,
        p(0, 1),
      ),
    ).toEqual([
      [1, 1],
      [2, 1],
    ]);
    expect(
      orderBanks(
        grid,
        [
          [2, 1],
          [1, 1],
        ],
        at,
        p(0, -1),
      ),
    ).toEqual([
      [1, 1],
      [2, 1],
    ]);
  });

  it('puts the north bank first where a river runs east-west', () => {
    const n = centreOf(grid, offset(1, 1));
    const s2 = centreOf(grid, offset(1, 2));
    const mid = p((n.x + s2.x) / 2, (n.y + s2.y) / 2);
    expect(
      orderBanks(
        grid,
        [
          [1, 2],
          [1, 1],
        ],
        mid,
        p(-1, 0),
      ),
    ).toEqual([
      [1, 1],
      [1, 2],
    ]);
  });
});
