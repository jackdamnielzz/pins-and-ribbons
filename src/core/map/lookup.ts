import { axialToOffset, inBounds, layoutAcrossFlats, pixelToHex, type Layout } from '../hex/index.ts';
import type { HexMap, HexRecord } from './types.ts';

/** The hex layout of a map in map km (PLAN 4.2). */
export function mapLayout(map: HexMap): Layout {
  return layoutAcrossFlats(map.grid.hexAcrossFlatsKm, map.grid.origin[0], map.grid.origin[1]);
}

/** The hex under a point in map km, or undefined off the grid. */
export function hexAtPoint(map: HexMap, layout: Layout, x: number, y: number): HexRecord | undefined {
  const o = axialToOffset(pixelToHex(layout, { x, y }));
  if (!inBounds(o, map.grid.cols, map.grid.rows)) return undefined;
  return map.hexes[o.row * map.grid.cols + o.col];
}
