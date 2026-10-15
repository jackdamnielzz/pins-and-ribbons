import {
  fromNordDeGuerre,
  sixFigureReference,
  toNordDeGuerre,
  type GridPoint,
} from '../geo/nord-de-guerre.ts';
import { fromRD, toRD, type RD } from '../geo/rd.ts';

/**
 * Map km (x east, y south from the sheet's north-west corner, PLAN 9) to and from the
 * Nord de Guerre grid of the 1944 sheets.
 */

export interface MapPoint {
  x: number;
  y: number;
}

export function mapToGrid(p: MapPoint, originRD: RD): GridPoint {
  const ll = fromRD({ x: originRD.x + p.x * 1000, y: originRD.y - p.y * 1000 });
  return toNordDeGuerre(ll.lon, ll.lat);
}

export function gridToMap(g: GridPoint, originRD: RD): MapPoint {
  const ll = fromNordDeGuerre(g);
  const rd = toRD(ll);
  return { x: (rd.x - originRD.x) / 1000, y: (originRD.y - rd.y) / 1000 };
}

/** Six-figure map reference of a map point, as the signals and tooltips print it. */
export function gridReference(p: MapPoint, originRD: RD): string {
  return sixFigureReference(mapToGrid(p, originRD));
}
