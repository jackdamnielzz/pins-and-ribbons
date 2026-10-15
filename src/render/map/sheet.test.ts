import { describe, expect, it } from 'vitest';
import en from '../../i18n/en.json';
import { TERRAINS } from '../../core/map/types.ts';
import { kmToWorld, worldToKm, type SheetGeometry } from './sheet';
import { pencilZoneName } from './furniture';

const geo: SheetGeometry = { width: 2000, height: 2600, mapX: 160, mapY: 160 };

describe('sheet coordinates', () => {
  it('converts map km to world pixels and back', () => {
    const toWorld = kmToWorld(geo);
    for (const [x, y] of [
      [0, 0],
      [12.5, 17.25],
      [25.5, 34.9],
    ] as [number, number][]) {
      const [wx, wy] = toWorld([x, y]);
      const back = worldToKm(geo, wx, wy);
      expect(back.x).toBeCloseTo(x, 9);
      expect(back.y).toBeCloseTo(y, 9);
    }
    expect(toWorld([0, 0])).toEqual([160, 160]);
  });
});

describe('map text', () => {
  it('has a tooltip name for every terrain type', () => {
    for (const terrain of TERRAINS) expect(en).toHaveProperty(`terrain.${terrain}`);
  });

  it('pencils zone names the way the 1944 maps did', () => {
    expect(pencilZoneName('LZ S')).toBe("LZ 'S'");
    expect(pencilZoneName('DZ X')).toBe("DZ 'X'");
    expect(pencilZoneName('Polish DZ (Driel)')).toBe('Polish DZ');
    expect(pencilZoneName('Supply dropping point V')).toBe('Supply dropping point V');
  });
});
