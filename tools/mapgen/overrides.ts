import { readFileSync } from 'node:fs';
import { pointInRings, type Pt, type Ring } from './geometry.ts';
import type { MapFeature } from './osm.ts';

/**
 * PLAN 9 step 4: historical overrides. The file is GeoJSON; each feature is one override.
 *
 * - `remove`: drop every OSM feature in `layers` whose tags match `match` (and that lies inside
 *   the override's polygon, if it has one). For post-war features.
 * - `include`: keep features of an opt-in layer (ferries) that match. Opt-in layers keep nothing
 *   unless an override includes it, because most of today's ferries did not exist in 1944.
 * - `cover`: a polygon of known 1944 land cover (`cover`: `built-up` for a settlement core,
 *   `heath` for heath). It sets terrain directly; `layers` and `match` are not used.
 *
 * Every override must name its historical reference in `source`; an override without a
 * proper reference says `TODO(history)` there, and the generator lists it in its report.
 */

export type OverrideCover = 'built-up' | 'heath';

export interface Override {
  id: string;
  action: 'remove' | 'include' | 'cover';
  /** For `cover`: what the polygon was in 1944. */
  cover?: OverrideCover;
  layers: string[];
  /** Tag → value. A tag holding a `;` list matches if any part equals the value. */
  match: Record<string, string>;
  /** Optional area limit, lon/lat rings. */
  area?: Ring[];
  note?: string;
  source: string;
}

export interface OverrideFile {
  overrides: Override[];
  /** Known 1944 differences that cannot be applied yet, each with TODO(history). */
  todo: string[];
}

export const OPT_IN_LAYERS = ['ferries'];

interface GeoJsonOverride {
  type: 'Feature';
  geometry: null | { type: 'Polygon'; coordinates: number[][][] };
  properties: Omit<Override, 'area'>;
}

export function parseOverrides(json: unknown): OverrideFile {
  const fc = json as { type: string; features: GeoJsonOverride[]; todo?: string[] };
  if (fc.type !== 'FeatureCollection') throw new Error('overrides: expected a GeoJSON FeatureCollection');
  const ids = new Set<string>();
  const overrides = fc.features.map((f): Override => {
    const p = f.properties;
    if (!p.id || ids.has(p.id)) throw new Error(`overrides: missing or duplicate id "${p.id}"`);
    ids.add(p.id);
    if (p.action !== 'remove' && p.action !== 'include' && p.action !== 'cover')
      throw new Error(`overrides: ${p.id} has unknown action`);
    if (!p.source || p.source.trim() === '') throw new Error(`overrides: ${p.id} has no source property`);
    const area = f.geometry?.coordinates.map((ring) =>
      ring.map(([x, y]) => ({ x: x as number, y: y as number })),
    );
    if (p.action === 'cover') {
      if (p.cover !== 'built-up' && p.cover !== 'heath')
        throw new Error(`overrides: ${p.id} has unknown cover`);
      if (!area) throw new Error(`overrides: ${p.id} needs a polygon`);
      return { ...p, layers: [], match: {}, area };
    }
    if (!p.layers?.length || !p.match || Object.keys(p.match).length === 0) {
      throw new Error(`overrides: ${p.id} needs layers and match`);
    }
    return area ? { ...p, area } : { ...p };
  });
  return { overrides, todo: fc.todo ?? [] };
}

export function loadOverrides(path: string): OverrideFile {
  return parseOverrides(JSON.parse(readFileSync(path, 'utf8')));
}

function tagMatches(value: string | undefined, wanted: string): boolean {
  if (value === undefined) return false;
  return value.split(';').some((part) => part.trim() === wanted);
}

function vertices(f: MapFeature): Pt[] {
  const g = f.geometry;
  if (g.type === 'point') return [g.point];
  if (g.type === 'line') return g.line;
  return g.rings.flat();
}

export function matches(o: Override, f: MapFeature): boolean {
  if (o.action === 'cover' || !o.layers.includes(f.layer)) return false;
  for (const [tag, wanted] of Object.entries(o.match)) if (!tagMatches(f.tags[tag], wanted)) return false;
  const area = o.area;
  if (area && !vertices(f).some((p) => pointInRings(p, area))) return false;
  return true;
}

export interface OverrideResult {
  features: MapFeature[];
  /** Override id → number of OSM features it removed or included. */
  applied: Record<string, number>;
}

export function applyOverrides(features: MapFeature[], file: OverrideFile): OverrideResult {
  const applied: Record<string, number> = Object.fromEntries(file.overrides.map((o) => [o.id, 0]));
  const kept: MapFeature[] = [];
  for (const f of features) {
    const removedBy = file.overrides.filter((o) => o.action === 'remove' && matches(o, f));
    const includedBy = file.overrides.filter((o) => o.action === 'include' && matches(o, f));
    for (const o of [...removedBy, ...includedBy]) applied[o.id] = (applied[o.id] ?? 0) + 1;
    if (removedBy.length > 0) continue;
    if (OPT_IN_LAYERS.includes(f.layer) && includedBy.length === 0) continue;
    kept.push(f);
  }
  return { features: kept, applied };
}

/** The `cover` overrides of one kind, as lon/lat polygons. */
export function coverAreas(file: OverrideFile, cover: OverrideCover): Ring[][] {
  return file.overrides.filter((o) => o.action === 'cover' && o.cover === cover).map((o) => o.area ?? []);
}
