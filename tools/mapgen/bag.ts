import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ringArea, type Pt } from './geometry.ts';

/**
 * 1944 built-up area from BAG building footprints (Basisregistratie Adressen en Gebouwen,
 * Kadaster, via the PDOK WFS). Only buildings with a construction year (bouwjaar) up to
 * `maxYear` are kept. BAG covers the Netherlands only.
 */

const WFS = 'https://service.pdok.nl/lv/bag/wfs/v2_0';
const PAGE = 1000;
/** BAG statuses of buildings that stand (or stood until recently); unbuilt and demolished ones are left out. */
const STANDING = new Set([
  'Pand in gebruik',
  'Pand in gebruik (niet ingemeten)',
  'Verbouwing pand',
  'Pand buiten gebruik',
  'Sloopvergunning verleend',
]);
/** Years below this are placeholders in BAG, not real construction years. */
const MIN_REAL_YEAR = 1200;

/** One building, reduced to what the classifier needs. Coordinates are RD New metres. */
export interface Building {
  x: number;
  y: number;
  areaM2: number;
  year: number;
}

export interface RdBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

function filterXml(box: RdBox, maxYear: number): string {
  return (
    '<fes:Filter xmlns:fes="http://www.opengis.net/fes/2.0" xmlns:gml="http://www.opengis.net/gml/3.2"><fes:And>' +
    '<fes:BBOX><fes:ValueReference>geom</fes:ValueReference>' +
    `<gml:Envelope srsName="urn:ogc:def:crs:EPSG::28992"><gml:lowerCorner>${box.minX} ${box.minY}</gml:lowerCorner>` +
    `<gml:upperCorner>${box.maxX} ${box.maxY}</gml:upperCorner></gml:Envelope></fes:BBOX>` +
    '<fes:PropertyIsLessThanOrEqualTo><fes:ValueReference>bouwjaar</fes:ValueReference>' +
    `<fes:Literal>${maxYear}</fes:Literal></fes:PropertyIsLessThanOrEqualTo>` +
    '</fes:And></fes:Filter>'
  );
}

interface WfsFeature {
  properties: { bouwjaar: number; status: string };
  geometry: { type: 'Polygon' | 'MultiPolygon'; coordinates: number[][][] | number[][][][] } | null;
}

/** Reduces a GeoJSON footprint to centroid and area. Holes are subtracted. */
export function toBuilding(f: WfsFeature): Building | undefined {
  const { bouwjaar, status } = f.properties;
  if (!f.geometry || !STANDING.has(status) || bouwjaar < MIN_REAL_YEAR) return undefined;
  const polygons = (
    f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates
  ) as number[][][][];
  let area = 0;
  let cx = 0;
  let cy = 0;
  for (const polygon of polygons) {
    polygon.forEach((ring, i) => {
      const pts: Pt[] = ring.map(([x, y]) => ({ x: x as number, y: y as number }));
      const a = ringArea(pts) * (i === 0 ? 1 : -1);
      const n = Math.max(1, pts.length - 1);
      const mx = pts.slice(0, n).reduce((s, p) => s + p.x, 0) / n;
      const my = pts.slice(0, n).reduce((s, p) => s + p.y, 0) / n;
      area += a;
      cx += mx * a;
      cy += my * a;
    });
  }
  if (area <= 0) return undefined;
  return { x: cx / area, y: cy / area, areaM2: area, year: bouwjaar };
}

async function fetchPage(box: RdBox, maxYear: number, start: number): Promise<WfsFeature[]> {
  const params = new URLSearchParams({
    service: 'WFS',
    version: '2.0.0',
    request: 'GetFeature',
    typeNames: 'bag:pand',
    outputFormat: 'application/json',
    count: String(PAGE),
    startIndex: String(start),
    sortBy: 'identificatie',
    propertyName: 'geom,bouwjaar,status',
    FILTER: filterXml(box, maxYear),
  });
  for (let attempt = 1; ; attempt++) {
    const response = await fetch(`${WFS}?${params.toString()}`);
    if (response.ok) return ((await response.json()) as { features: WfsFeature[] }).features;
    if (attempt >= 4) throw new Error(`BAG WFS request failed: ${response.status} ${await response.text()}`);
    await new Promise((resolve) => setTimeout(resolve, 5000 * attempt));
  }
}

/**
 * All standing buildings up to `maxYear` inside `extent`, fetched in square tiles of
 * `tileM` metres (each paged by 1000) and cached per tile.
 */
export async function loadBuildings(
  cacheDir: string,
  extent: RdBox,
  maxYear: number,
  tileM: number,
  options: { refresh: boolean; offline: boolean },
): Promise<Building[]> {
  const out: Building[] = [];
  let fetched = 0;
  for (let y0 = extent.minY; y0 < extent.maxY; y0 += tileM) {
    for (let x0 = extent.minX; x0 < extent.maxX; x0 += tileM) {
      const box = {
        minX: x0,
        minY: y0,
        maxX: Math.min(x0 + tileM, extent.maxX),
        maxY: Math.min(y0 + tileM, extent.maxY),
      };
      const file = join(cacheDir, `bag-${maxYear}-${box.minX}-${box.minY}-${box.maxX}-${box.maxY}.json`);
      let tile: Building[];
      if (!options.refresh && existsSync(file)) {
        tile = JSON.parse(readFileSync(file, 'utf8')) as Building[];
      } else {
        if (options.offline) throw new Error(`BAG tile ${file} is not cached and --offline is set`);
        tile = [];
        for (let start = 0; ; start += PAGE) {
          const page = await fetchPage(box, maxYear, start);
          for (const f of page) {
            const b = toBuilding(f);
            // A building on a tile edge comes back for both tiles; keep it where its centroid is.
            if (b && b.x >= box.minX && b.x < box.maxX && b.y >= box.minY && b.y < box.maxY) tile.push(b);
          }
          if (page.length < PAGE) break;
        }
        mkdirSync(cacheDir, { recursive: true });
        writeFileSync(file, JSON.stringify(tile));
        fetched++;
      }
      out.push(...tile);
    }
  }
  if (fetched > 0) console.log(`  fetched ${fetched} BAG tile(s)`);
  return out;
}
