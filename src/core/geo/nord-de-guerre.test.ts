import { describe, expect, it } from 'vitest';
import { fromNordDeGuerre, sixFigureReference, toNordDeGuerre } from './nord-de-guerre.ts';

describe('Nord de Guerre grid', () => {
  it('puts the projection origin at the false easting and northing', () => {
    const p = toNordDeGuerre(2.33720833333333 + 5.4, 49.5);
    expect(p.easting).toBeCloseTo(500000, 3);
    expect(p.northing).toBeCloseTo(300000, 3);
  });

  it('round-trips points across the map area to within a millimetre', () => {
    for (const lat of [51.74, 51.9, 52.05]) {
      for (const lon of [5.7, 5.9, 6.1]) {
        const back = fromNordDeGuerre(toNordDeGuerre(lon, lat));
        expect(Math.abs(back.lat - lat) * 111_000).toBeLessThan(0.001);
        expect(Math.abs(back.lon - lon) * 68_000).toBeLessThan(0.001);
      }
    }
  });

  it('grows easting to the east and northing to the north at about 68.8 and 111.2 km per degree', () => {
    // 0.1 degree steps, scaled to km per degree.
    const a = toNordDeGuerre(5.9, 51.9);
    const east = toNordDeGuerre(6.0, 51.9);
    const north = toNordDeGuerre(5.9, 52.0);
    expect((east.easting - a.easting) / 100).toBeCloseTo(68.8, 0);
    expect((north.northing - a.northing) / 100).toBeCloseTo(111.2, 0);
  });

  it('writes six-figure references to the nearest 100 m below, without grid letters', () => {
    expect(sixFigureReference({ easting: 374605, northing: 576828 })).toBe('746768');
    expect(sixFigureReference({ easting: 300050, northing: 400999 })).toBe('000009');
    expect(sixFigureReference({ easting: 399999, northing: 599950 })).toBe('999999');
  });
});
