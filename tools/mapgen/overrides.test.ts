import { describe, expect, it } from 'vitest';
import type { MapFeature } from './osm.ts';
import { applyOverrides, parseOverrides } from './overrides.ts';

const feature = (id: string, layer: string, tags: Record<string, string>, x = 0, y = 0): MapFeature => ({
  id,
  layer,
  tags,
  geometry: {
    type: 'line',
    line: [
      { x, y },
      { x: x + 0.01, y },
    ],
  },
});

const file = (features: unknown[], todo: string[] = []) => ({ type: 'FeatureCollection', features, todo });
const override = (properties: Record<string, unknown>, geometry: unknown = null) => ({
  type: 'Feature',
  geometry,
  properties,
});

describe('parseOverrides', () => {
  it('requires a source on every override', () => {
    const bad = file([
      override({ id: 'x', action: 'remove', layers: ['roads'], match: { ref: 'A12' }, source: '' }),
    ]);
    expect(() => parseOverrides(bad)).toThrow(/no source/);
  });

  it('rejects duplicate ids, unknown actions and empty matches', () => {
    const o = { action: 'remove', layers: ['roads'], match: { ref: 'A12' }, source: 's' };
    expect(() => parseOverrides(file([override({ id: 'a', ...o }), override({ id: 'a', ...o })]))).toThrow(
      /duplicate/,
    );
    expect(() => parseOverrides(file([override({ id: 'a', ...o, action: 'move' })]))).toThrow(
      /unknown action/,
    );
    expect(() => parseOverrides(file([override({ id: 'a', ...o, match: {} })]))).toThrow(
      /needs layers and match/,
    );
  });

  it('keeps the todo list', () => {
    expect(parseOverrides(file([], ['TODO(history): x'])).todo).toEqual(['TODO(history): x']);
  });
});

describe('applyOverrides', () => {
  const overrides = parseOverrides(
    file([
      override({ id: 'no-a12', action: 'remove', layers: ['roads'], match: { ref: 'A12' }, source: 's' }),
      override({
        id: 'ferry',
        action: 'include',
        layers: ['ferries'],
        match: { name: 'Old Ferry' },
        source: 's',
      }),
      override(
        { id: 'area', action: 'remove', layers: ['roads'], match: { highway: 'tertiary' }, source: 's' },
        {
          type: 'Polygon',
          coordinates: [
            [
              [5, 5],
              [6, 5],
              [6, 6],
              [5, 6],
              [5, 5],
            ],
          ],
        },
      ),
    ]),
  );

  it('removes matching features, including tags that hold a ; list', () => {
    const features = [
      feature('a', 'roads', { ref: 'A12' }),
      feature('b', 'roads', { ref: 'A12;A348' }),
      feature('c', 'roads', { ref: 'N325' }),
      feature('d', 'rail', { ref: 'A12' }),
    ];
    const { features: kept, applied } = applyOverrides(features, overrides);
    expect(kept.map((f) => f.id)).toEqual(['c', 'd']);
    expect(applied['no-a12']).toBe(2);
  });

  it('keeps opt-in layers only when an override includes them', () => {
    const features = [
      feature('f1', 'ferries', { name: 'Old Ferry' }),
      feature('f2', 'ferries', { name: 'New Ferry' }),
    ];
    expect(applyOverrides(features, overrides).features.map((f) => f.id)).toEqual(['f1']);
  });

  it('limits an override to its area', () => {
    const inside = feature('in', 'roads', { highway: 'tertiary' }, 5.5, 5.5);
    const outside = feature('out', 'roads', { highway: 'tertiary' }, 9, 9);
    expect(applyOverrides([inside, outside], overrides).features.map((f) => f.id)).toEqual(['out']);
  });
});
