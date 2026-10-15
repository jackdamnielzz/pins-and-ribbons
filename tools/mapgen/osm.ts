import { stitchRings, type Pt, type Ring } from './geometry.ts';
import type { OverpassElement, OverpassResponse } from './overpass.ts';

export type Geometry =
  { type: 'point'; point: Pt } | { type: 'line'; line: Pt[] } | { type: 'polygon'; rings: Ring[] };

/** One OSM object. Coordinates are lon/lat (x = lon, y = lat) until projected. */
export interface MapFeature {
  id: string;
  layer: string;
  tags: Record<string, string>;
  geometry: Geometry;
}

/** Tags that make a closed way or a relation an area rather than a line. */
export function isAreaTags(tags: Record<string, string>): boolean {
  return (
    tags['natural'] === 'water' ||
    tags['natural'] === 'wood' ||
    tags['natural'] === 'heath' ||
    tags['waterway'] === 'riverbank' ||
    tags['landuse'] !== undefined
  );
}

function toPts(geometry: { lat: number; lon: number }[]): Pt[] {
  return geometry.map((g) => ({ x: g.lon, y: g.lat }));
}

export interface ConvertStats {
  forcedRings: number;
  skipped: number;
}

function convertElement(layer: string, e: OverpassElement, stats: ConvertStats): MapFeature | undefined {
  const tags = e.tags ?? {};
  const id = `${e.type}/${e.id}`;
  if (e.type === 'node') {
    if (e.lat === undefined || e.lon === undefined) return undefined;
    return { id, layer, tags, geometry: { type: 'point', point: { x: e.lon, y: e.lat } } };
  }
  if (e.type === 'way') {
    if (!e.geometry || e.geometry.length < 2) return undefined;
    const line = toPts(e.geometry);
    const first = line[0] as Pt;
    const last = line.at(-1) as Pt;
    const closed = first.x === last.x && first.y === last.y;
    if (isAreaTags(tags)) {
      if (!closed || line.length < 4) {
        stats.skipped++;
        return undefined;
      }
      return { id, layer, tags, geometry: { type: 'polygon', rings: [line] } };
    }
    return { id, layer, tags, geometry: { type: 'line', line } };
  }
  // Multipolygon relation: stitch outer and inner members into rings; fill uses even-odd.
  const pieces = (e.members ?? [])
    .filter(
      (m) => m.type === 'way' && m.geometry && (m.role === 'outer' || m.role === 'inner' || m.role === ''),
    )
    .map((m) => toPts(m.geometry ?? []));
  const { rings, forced } = stitchRings(pieces);
  stats.forcedRings += forced;
  if (rings.length === 0) {
    stats.skipped++;
    return undefined;
  }
  return { id, layer, tags, geometry: { type: 'polygon', rings } };
}

export function convertLayer(layer: string, response: OverpassResponse, stats: ConvertStats): MapFeature[] {
  const out: MapFeature[] = [];
  for (const e of response.elements) {
    const f = convertElement(layer, e, stats);
    if (f) out.push(f);
  }
  return out;
}
