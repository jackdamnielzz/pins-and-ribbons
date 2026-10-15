import type { HexMap } from '../../core/map/types.ts';
import buildingsUrl from '../../../data/maps/the-island/buildings.json?url';
import hexesUrl from '../../../data/maps/the-island/hexes.json?url';
import labelsUrl from '../../../data/maps/the-island/labels.json?url';
import layersUrl from '../../../data/maps/the-island/layers.geojson?url';

/** The generated map files of one region (PLAN 9 step 8), as the renderer reads them. */

export type Position = [number, number];

export interface LayerFeature {
  type: 'Feature';
  properties: { layer: string; name?: string; class?: string; elevationM?: number; id?: string } & Record<
    string,
    unknown
  >;
  geometry:
    | { type: 'LineString'; coordinates: Position[] }
    | { type: 'Polygon'; coordinates: Position[][] }
    | { type: 'Point'; coordinates: Position };
}

export interface Label {
  name: string;
  kind: string;
  priority: number;
  /** Map km. */
  at: Position;
  hex: Position;
}

export interface MapData {
  hexes: HexMap;
  layers: LayerFeature[];
  labels: Label[];
  /** Flat [x, y, side] triples in map metres. */
  buildings: number[];
}

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load ${url}: ${response.status}`);
  return (await response.json()) as T;
}

export async function loadMapData(): Promise<MapData> {
  const [hexes, layers, labels, buildings] = await Promise.all([
    getJson<HexMap>(hexesUrl),
    getJson<{ features: LayerFeature[] }>(layersUrl),
    getJson<Label[]>(labelsUrl),
    getJson<{ cells: number[] }>(buildingsUrl),
  ]);
  return { hexes, layers: layers.features, labels, buildings: buildings.cells };
}
