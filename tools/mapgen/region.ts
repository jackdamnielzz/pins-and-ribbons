import { readFileSync } from 'node:fs';

/** tools/mapgen/regions/<id>.json (PLAN 9 step 1). */

export interface CrossingSpec {
  kind: 'road' | 'rail' | 'ferry';
  river: string;
  /** Part of the OSM name the crossing must carry, if given. */
  nameIncludes?: string;
  /** Lon/lat; the matching crossing nearest to this point is used. */
  near: [lon: number, lat: number];
}

export interface ObjectiveSpec {
  id: string;
  name: string;
  crossing?: CrossingSpec;
  todo?: string;
  source: string;
}

export interface ZoneSpec {
  id: string;
  name: string;
  near?: [lon: number, lat: number];
  atObjective?: { id: string; bank: 'north' | 'south' };
  relation?: string;
  todo?: string;
  source: string;
}

export interface Region {
  id: string;
  name: string;
  extentNote: string;
  projection: 'EPSG:28992';
  /** RD New coordinates of the map's north-west corner (map km 0, 0). */
  originRD: { x: number; y: number };
  grid: { cols: number; rows: number; hexAcrossFlatsKm: number };
  fetchMarginKm: number;
  simplifyToleranceM: number;
  rasterCellM: number;
  /** Polygons smaller than this are left out of layers.geojson (they still count for terrain). */
  layerMinAreaKm2: number;
  elevation: {
    resampleM: number;
    bandLowerBoundsM: number[];
    contourIntervalM: number;
    contourMinM: number;
    contourSmoothPasses: number;
  };
  classification: {
    minShare: Record<'river' | 'built-up' | 'woodland' | 'heath', number>;
    polderMaxElevationM: number;
  };
  /** OSM highway classes that set a hex's road flag (PLAN 9: primary and secondary roads). */
  roadFlagClasses: string[];
  barrierRivers: string[];
  crossingWindowKm: number;
  objectives: ObjectiveSpec[];
  zones: ZoneSpec[];
  mainRoute: { note: string; via: string[] };
}

export function loadRegion(path: string): Region {
  return JSON.parse(readFileSync(path, 'utf8')) as Region;
}
