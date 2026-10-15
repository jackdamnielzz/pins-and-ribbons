import { describe, expect, it } from 'vitest';
import { fromRD, toRD } from './rd.ts';

describe('RD New projection', () => {
  it('maps the Amersfoort reference point to (155000, 463000)', () => {
    const rd = toRD({ lon: 5.38720621, lat: 52.1551744 });
    expect(rd.x).toBeCloseTo(155000, 6);
    expect(rd.y).toBeCloseTo(463000, 6);
  });

  it('round-trips points across the map area to within a metre', () => {
    // The forward and inverse polynomials are independent fits, so agreement checks both.
    for (const lat of [51.74, 51.85, 51.95, 52.05]) {
      for (const lon of [5.7, 5.85, 6.0, 6.1]) {
        const back = fromRD(toRD({ lon, lat }));
        expect(Math.abs(back.lat - lat) * 111_000).toBeLessThan(1);
        expect(Math.abs(back.lon - lon) * 68_000).toBeLessThan(1);
      }
    }
  });

  it('runs x east and y north at about 68.8 km and 111.2 km per degree', () => {
    const a = toRD({ lon: 5.9, lat: 51.9 });
    // 0.1 degree steps, scaled to km per degree.
    const east = toRD({ lon: 6.0, lat: 51.9 });
    const north = toRD({ lon: 5.9, lat: 52.0 });
    expect((east.x - a.x) / 100).toBeCloseTo(68.8, 0);
    expect((north.y - a.y) / 100).toBeCloseTo(111.2, 0);
  });
});
