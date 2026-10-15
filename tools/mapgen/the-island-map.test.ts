import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Ajv2020 } from 'ajv/dist/2020.js';
import { describe, expect, it } from 'vitest';
import type { HexMap } from '../../src/core/map/types.ts';
import { validateMap } from './validate.ts';

/** Checks the committed output of `npm run mapgen` for The Island (PLAN 9 steps 7 and 8). */

const root = join(import.meta.dirname, '..', '..');
const readJson = (path: string): unknown => JSON.parse(readFileSync(join(root, path), 'utf8'));
const map = readJson('data/maps/the-island/hexes.json') as HexMap;

describe('generated map: The Island', () => {
  it('matches the hexes.json schema', () => {
    const ajv = new Ajv2020({ allErrors: true });
    const validate = ajv.compile(readJson('data/schema/hexes.schema.json') as object);
    const ok = validate(map);
    expect(validate.errors ?? []).toEqual([]);
    expect(ok).toBe(true);
  });

  it('passes every validation rule', () => {
    expect(validateMap(map).errors).toEqual([]);
  });

  it('has the bridges and ferries the scenario needs on the right rivers', () => {
    const byObjective = (id: string) => {
      const anchor = map.anchors.find((a) => a.id === id);
      return map.crossings.find((c) => c.id === anchor?.crossing);
    };
    expect(byObjective('arnhem-road-bridge')).toMatchObject({ kind: 'road', river: 'Nederrijn' });
    expect(byObjective('arnhem-rail-bridge')).toMatchObject({ kind: 'rail', river: 'Nederrijn' });
    expect(byObjective('nijmegen-road-bridge')).toMatchObject({ kind: 'road', river: 'Waal' });
    expect(byObjective('nijmegen-rail-bridge')).toMatchObject({ kind: 'rail', river: 'Waal' });
    expect(byObjective('heveadorp-ferry')).toMatchObject({ kind: 'ferry', river: 'Nederrijn' });
  });

  it('places every zone, except those still marked TODO(history)', () => {
    for (const a of map.anchors.filter((x) => x.kind === 'zone')) {
      if (a.todo) expect(a.todo).toMatch(/TODO\(history\)/);
      else expect(a.hex).toBeDefined();
    }
  });

  it('keeps post-war and unsourced crossings off the map', () => {
    const names = map.crossings.map((c) => c.name);
    for (const gone of [
      'De Oversteek',
      'Nelson Mandelabrug',
      'Andrej Sacharovbrug',
      'Betuweroute',
      'Brug bij Westervoort',
    ]) {
      expect(names).not.toContain(gone);
    }
    expect(map.crossings.every((c) => c.source.includes('docs/history/map.md'))).toBe(true);
  });

  it('records the September 1944 state of each crossing', () => {
    const state = (id: string) => map.crossings.find((c) => c.id === id)?.state;
    expect(state('grave-bridge')).toBe('intact');
    expect(state('heumen-bridge')).toBe('intact');
    expect(state('arnhem-pontoon-bridge')).toBe('damaged');
    expect(state('pannerden-ferry')).toBe('not-in-service');
    for (const id of ['malden-bridge', 'hatert-bridge', 'honinghutje-bridge', 'mook-rail-bridge']) {
      expect(map.crossings.find((c) => c.id === id)?.fate).toBeTruthy();
    }
  });

  it('has heath on the Renkum and Ginkel heath zones and farmland around Groesbeek and Overasselt', () => {
    const terrainAt = (id: string) => {
      const hex = map.anchors.find((a) => a.id === id)?.hex as [number, number];
      return map.hexes[hex[1] * map.grid.cols + hex[0]]?.terrain;
    };
    for (const id of ['LZ-Z', 'DZ-X', 'LZ-X', 'DZ-Y']) expect(terrainAt(id)).toBe('heath');
    for (const id of ['DZ-N', 'DZ-T', 'DZ-O']) expect(['open', 'polder']).toContain(terrainAt(id));
  });

  it('runs the Club Route through Grave, Heumen, Nijmegen and Elst to the Arnhem bridge', () => {
    expect(map.mainRoute.via).toEqual([
      'grave-bridge',
      'heumen-bridge',
      'nijmegen-road-bridge',
      'elst',
      'arnhem-road-bridge',
    ]);
    expect(map.mainRoute.hexes.length).toBeGreaterThan(30);
    expect(map.mainRoute.hexes[0]?.[1]).toBe(map.grid.rows - 1);
  });
});
