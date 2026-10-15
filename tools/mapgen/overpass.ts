import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** PLAN 9 step 2: OpenStreetMap data via the Overpass API, cached on disk (not committed). */

const ENDPOINT = 'https://overpass-api.de/api/interpreter';
// Identifies the tool to the Overpass operators, as their usage policy asks.
const USER_AGENT = 'pins-and-ribbons-mapgen/0.1 (+https://github.com/jackdamnielzz/pins-and-ribbons)';

export interface BBox {
  south: number;
  west: number;
  north: number;
  east: number;
}

export interface OverpassGeomPoint {
  lat: number;
  lon: number;
}

export interface OverpassMember {
  type: 'node' | 'way' | 'relation';
  ref: number;
  role: string;
  geometry?: OverpassGeomPoint[];
}

export interface OverpassElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  tags?: Record<string, string>;
  lat?: number;
  lon?: number;
  geometry?: OverpassGeomPoint[];
  members?: OverpassMember[];
}

export interface OverpassResponse {
  osm3s?: { timestamp_osm_base?: string };
  elements: OverpassElement[];
}

/** One Overpass request per layer, so each layer is cached separately. */
export function layerQueries(b: BBox): Record<string, string> {
  const bbox = `${b.south},${b.west},${b.north},${b.east}`;
  const wrap = (body: string): string => `[out:json][timeout:300][bbox:${bbox}];\n(\n${body}\n);\nout geom;`;
  return {
    water: wrap(
      [
        'way["waterway"~"^(river|canal)$"];',
        'way["natural"="water"]["water"~"^(river|canal)$"];',
        'relation["natural"="water"]["water"~"^(river|canal)$"];',
        'way["waterway"="riverbank"];',
        'relation["waterway"="riverbank"];',
      ].join('\n'),
    ),
    roads: wrap('way["highway"~"^(motorway|trunk|primary|secondary|tertiary)$"];'),
    rail: wrap('way["railway"="rail"][!"service"];'),
    landcover: wrap(
      [
        'way["landuse"~"^(forest|residential)$"];',
        'relation["landuse"~"^(forest|residential)$"];',
        'way["natural"~"^(wood|heath)$"];',
        'relation["natural"~"^(wood|heath)$"];',
      ].join('\n'),
    ),
    places: wrap('node["place"~"^(city|town|village|hamlet)$"];'),
    ferries: wrap('way["route"="ferry"];'),
  };
}

const RETRY_STATUS = [429, 502, 503, 504];
const ATTEMPTS = 4;

/** POSTs a query, retrying with growing pauses when the server is busy. */
async function request(layer: string, query: string): Promise<string> {
  for (let attempt = 1; ; attempt++) {
    console.log(`  fetching ${layer} from Overpass${attempt > 1 ? ` (attempt ${attempt})` : ''}...`);
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'User-Agent': USER_AGENT, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ data: query }),
    });
    if (response.ok) return response.text();
    if (attempt >= ATTEMPTS || !RETRY_STATUS.includes(response.status)) {
      throw new Error(`Overpass request for "${layer}" failed: ${response.status} ${await response.text()}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 15_000 * attempt));
  }
}

function cacheFile(cacheDir: string, layer: string, query: string): string {
  const hash = createHash('sha256').update(query).digest('hex').slice(0, 12);
  return join(cacheDir, `overpass-${layer}-${hash}.json`);
}

/**
 * Returns the response for a query, from the cache if present, otherwise from Overpass.
 * The cache key is the query text, so changing the extent or tags fetches fresh data.
 */
export async function fetchLayer(
  cacheDir: string,
  layer: string,
  query: string,
  options: { refresh: boolean; offline: boolean },
): Promise<OverpassResponse> {
  const file = cacheFile(cacheDir, layer, query);
  if (!options.refresh && existsSync(file)) {
    return JSON.parse(readFileSync(file, 'utf8')) as OverpassResponse;
  }
  if (options.offline)
    throw new Error(`Overpass layer "${layer}" is not cached and --offline is set (${file})`);

  const text = await request(layer, query);
  const parsed = JSON.parse(text) as OverpassResponse;
  mkdirSync(cacheDir, { recursive: true });
  writeFileSync(file, text);
  return parsed;
}
