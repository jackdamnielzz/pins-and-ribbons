import { readFileSync } from 'node:fs';

/** tools/mapgen/regions/<id>.json (PLAN 9 step 1). */

export type CrossingState = 'intact' | 'damaged' | 'blown' | 'not-in-service';

/** A bridge or ferry that existed in September 1944, with a source. Only these are kept. */
export interface CrossingSpec {
  id: string;
  name: string;
  kind: 'road' | 'rail' | 'ferry' | 'pontoon';
  river: string;
  /** Lon/lat; the matching OSM crossing nearest to this point is used. */
  near: [lon: number, lat: number];
  /** Part of the OSM name the crossing must carry, if given. */
  nameIncludes?: string;
  /** Not in OpenStreetMap: placed at `near`, across the river. */
  manual?: boolean;
  /** State at the start of the scenario (17 September 1944, 13:00). */
  state: CrossingState;
  /** What happened to it later, for the scenario script. */
  fate?: string;
  source: string;
}

export interface ObjectiveSpec {
  id: string;
  name: string;
  crossing?: string;
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

export interface WaypointSpec {
  id: string;
  name: string;
  near: [lon: number, lat: number];
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
  /** A detected crossing matches a spec only within this distance of its `near` point. */
  crossingMatchKm: number;
  builtUp: {
    note: string;
    maxYear: number;
    minFootprintShare: number;
    coreMinShare: number;
    tileM: number;
  };
  /** Share of a hex inside sourced 1944 heath polygons that makes it heath. */
  heathOverrideMinShare: number;
  crossings: CrossingSpec[];
  objectives: ObjectiveSpec[];
  zones: ZoneSpec[];
  waypoints: WaypointSpec[];
  mainRoute: { note: string; via: string[] };
}

export function loadRegion(path: string): Region {
  return JSON.parse(readFileSync(path, 'utf8')) as Region;
}
