import { axialRound, type Axial } from './coords.ts';

/**
 * Pointy-top hex layout. `size` is the centre-to-corner distance; the distance across
 * flats is size × √3. `originX`/`originY` is where the centre of axial (0, 0) lies.
 * Units are whatever the caller uses (map kilometres, world pixels); y grows downwards.
 */
export interface Layout {
  readonly size: number;
  readonly originX: number;
  readonly originY: number;
}

export interface Point {
  readonly x: number;
  readonly y: number;
}

const SQRT3 = Math.sqrt(3);

/** A layout whose hexes measure `acrossFlats` from one flat side to the other. */
export function layoutAcrossFlats(acrossFlats: number, originX = 0, originY = 0): Layout {
  return { size: acrossFlats / SQRT3, originX, originY };
}

export function hexToPixel(layout: Layout, a: Axial): Point {
  return {
    x: layout.originX + layout.size * SQRT3 * (a.q + a.r / 2),
    y: layout.originY + layout.size * 1.5 * a.r,
  };
}

export function pixelToHex(layout: Layout, p: Point): Axial {
  const x = (p.x - layout.originX) / layout.size;
  const y = (p.y - layout.originY) / layout.size;
  return axialRound((SQRT3 / 3) * x - y / 3, (2 / 3) * y);
}

/** The six corners, starting at the top corner and going clockwise. */
export function hexCorners(layout: Layout, a: Axial): Point[] {
  const c = hexToPixel(layout, a);
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 180) * (60 * i - 90);
    return { x: c.x + layout.size * Math.cos(angle), y: c.y + layout.size * Math.sin(angle) };
  });
}
