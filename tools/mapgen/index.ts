/**
 * Map generator (PLAN 9). Usage: npm run mapgen -- [region] [--refresh] [--offline]
 *
 * 1. extent from tools/mapgen/regions/<region>.json
 * 2. OpenStreetMap layers via Overpass (cached in tools/mapgen/cache/)
 * 3. SRTM elevation (cached)
 * 4. historical overrides from tools/mapgen/overrides/<region>.geojson
 * 5. projection to map km and simplification
 * 6. hex classification
 * 7. validation (fails loudly)
 * 8. output to data/maps/<region>/
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  coverShares,
  findCrossingPoints,
  hexAt,
  hexesOnLine,
  indexLines,
  indexOf,
  makeGrid,
  markRiverEdges,
  placeCrossings,
  round3,
  terrainFor,
  type CoverPolygon,
  type CrossingLine,
} from './classify.ts';
import { contour, loadTile, resample, smooth, type HgtTile } from './elevation.ts';
import { clipLine, clipRing, ringArea, simplify, simplifyRing, type Box, type Pt } from './geometry.ts';
import type { AnchorRecord, CrossingRecord, HexMap, HexRecord, Terrain } from './map-types.ts';
import { convertLayer, type ConvertStats, type MapFeature } from './osm.ts';
import { applyOverrides, loadOverrides } from './overrides.ts';
import { fetchLayer, layerQueries, type BBox } from './overpass.ts';
import { fromRD, toRD, type LonLat } from './projection.ts';
import { loadRegion, type CrossingSpec, type Region } from './region.ts';
import { validateMap } from './validate.ts';

const ROOT = join(import.meta.dirname, '..', '..');
const CACHE = join(import.meta.dirname, 'cache');

const PLACE_PRIORITY: Record<string, number> = { city: 1, town: 2, village: 3, hamlet: 4 };

function parseArgs(argv: string[]): { region: string; refresh: boolean; offline: boolean } {
  const flags = new Set(argv.filter((a) => a.startsWith('--')));
  for (const f of flags) if (f !== '--refresh' && f !== '--offline') throw new Error(`unknown option ${f}`);
  const region = argv.find((a) => !a.startsWith('--')) ?? 'the-island';
  return { region, refresh: flags.has('--refresh'), offline: flags.has('--offline') };
}

function slug(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const region = loadRegion(join(import.meta.dirname, 'regions', `${args.region}.json`));
  const overrideFile = loadOverrides(join(import.meta.dirname, 'overrides', `${args.region}.geojson`));
  const grid = makeGrid(region.grid.cols, region.grid.rows, region.grid.hexAcrossFlatsKm);

  // Step 1: extent. Map km: x east and y south from the north-west corner.
  const toMap = (ll: LonLat): Pt => {
    const rd = toRD(ll);
    return { x: (rd.x - region.originRD.x) / 1000, y: (region.originRD.y - rd.y) / 1000 };
  };
  const toLonLat = (p: Pt): LonLat =>
    fromRD({ x: region.originRD.x + p.x * 1000, y: region.originRD.y - p.y * 1000 });
  const m = region.fetchMarginKm;
  const corners = [
    toLonLat({ x: -m, y: -m }),
    toLonLat({ x: grid.widthKm + m, y: -m }),
    toLonLat({ x: -m, y: grid.heightKm + m }),
    toLonLat({ x: grid.widthKm + m, y: grid.heightKm + m }),
  ];
  const bbox: BBox = {
    south: Math.min(...corners.map((c) => c.lat)),
    north: Math.max(...corners.map((c) => c.lat)),
    west: Math.min(...corners.map((c) => c.lon)),
    east: Math.max(...corners.map((c) => c.lon)),
  };
  console.log(
    `${region.name}: ${grid.cols} × ${grid.rows} hexes, ${grid.widthKm.toFixed(1)} × ${grid.heightKm.toFixed(1)} km`,
  );

  // Step 2: OpenStreetMap.
  console.log('Step 2: OpenStreetMap layers');
  const stats: ConvertStats = { forcedRings: 0, skipped: 0 };
  let osmTimestamp = '';
  let features: MapFeature[] = [];
  for (const [layer, query] of Object.entries(layerQueries(bbox))) {
    const response = await fetchLayer(CACHE, layer, query, args);
    osmTimestamp = response.osm3s?.timestamp_osm_base ?? osmTimestamp;
    features = features.concat(convertLayer(layer, response, stats));
  }
  console.log(
    `  ${features.length} features (${stats.forcedRings} rings closed by force, ${stats.skipped} skipped)`,
  );

  // Step 3: elevation.
  console.log('Step 3: elevation');
  const tiles: HgtTile[] = [];
  for (let lat = Math.floor(bbox.south); lat <= Math.floor(bbox.north); lat++) {
    for (let lon = Math.floor(bbox.west); lon <= Math.floor(bbox.east); lon++) {
      tiles.push(await loadTile(CACHE, lat, lon, args));
    }
  }
  const elevation = resample(tiles, grid.widthKm, grid.heightKm, region.elevation.resampleM / 1000, toLonLat);

  // Step 4: historical overrides.
  console.log('Step 4: historical overrides');
  const overridden = applyOverrides(features, overrideFile);
  features = overridden.features;
  for (const o of overrideFile.overrides) {
    const n = overridden.applied[o.id] ?? 0;
    console.log(`  ${o.action} ${o.id}: ${n} feature(s)${n === 0 ? '  <-- matched nothing' : ''}`);
  }

  // Step 5: project to map km and simplify.
  console.log('Step 5: projection and simplification');
  const tol = region.simplifyToleranceM / 1000;
  const projected = features.map((f): MapFeature => {
    const g = f.geometry;
    if (g.type === 'point')
      return { ...f, geometry: { type: 'point', point: toMap({ lon: g.point.x, lat: g.point.y }) } };
    const proj = (pts: Pt[]): Pt[] => pts.map((p) => toMap({ lon: p.x, lat: p.y }));
    if (g.type === 'line') return { ...f, geometry: { type: 'line', line: simplify(proj(g.line), tol) } };
    const rings = g.rings.map((r) => simplifyRing(proj(r), tol)).filter((r): r is Pt[] => r !== undefined);
    return { ...f, geometry: { type: 'polygon', rings } };
  });

  // Step 6: classification.
  console.log('Step 6: hex classification');
  const hexElevation = new Float64Array(grid.cols * grid.rows);
  const hexElevationCount = new Float64Array(grid.cols * grid.rows);
  for (let j = 0; j < elevation.rows; j++) {
    for (let i = 0; i < elevation.cols; i++) {
      const o = hexAt(grid, { x: (i + 0.5) * elevation.cellKm, y: (j + 0.5) * elevation.cellKm });
      if (!o) continue;
      const k = indexOf(grid, o);
      hexElevation[k] = (hexElevation[k] as number) + (elevation.values[j * elevation.cols + i] as number);
      hexElevationCount[k] = (hexElevationCount[k] as number) + 1;
    }
  }

  const tags = (f: MapFeature, k: string): string | undefined => f.tags[k];
  const coverOf = (f: MapFeature): CoverPolygon['cover'] | undefined => {
    if (f.layer === 'water') return 'river';
    if (tags(f, 'landuse') === 'residential') return 'built-up';
    if (tags(f, 'landuse') === 'forest' || tags(f, 'natural') === 'wood') return 'woodland';
    if (tags(f, 'natural') === 'heath') return 'heath';
    return undefined;
  };
  const polygons: CoverPolygon[] = [];
  for (const f of projected) {
    const cover = coverOf(f);
    if (cover && f.geometry.type === 'polygon' && f.geometry.rings.length > 0)
      polygons.push({ cover, rings: f.geometry.rings });
  }
  const shares = coverShares(grid, polygons, region.rasterCellM / 1000);

  const hexes: HexRecord[] = [];
  for (let row = 0; row < grid.rows; row++) {
    for (let col = 0; col < grid.cols; col++) {
      const k = row * grid.cols + col;
      const elevationM = (hexElevation[k] as number) / Math.max(1, hexElevationCount[k] as number);
      hexes.push({
        col,
        row,
        terrain: terrainFor(shares[k] as Float64Array, elevationM, region.classification),
        road: false,
        rail: false,
        elevationM: Math.round(elevationM * 10) / 10,
        elevationBand: region.elevation.bandLowerBoundsM.filter((b) => elevationM >= b).length,
        riverEdges: [],
        edgeCrossings: [],
      });
    }
  }

  const lines = (layer: string): MapFeature[] =>
    projected.filter((f) => f.layer === layer && f.geometry.type === 'line');
  const lineOf = (f: MapFeature): Pt[] => (f.geometry.type === 'line' ? f.geometry.line : []);
  for (const f of lines('roads')) {
    if (!region.roadFlagClasses.includes(tags(f, 'highway') ?? '')) continue;
    for (const o of hexesOnLine(grid, lineOf(f))) (hexes[indexOf(grid, o)] as HexRecord).road = true;
  }
  for (const f of lines('rail'))
    for (const o of hexesOnLine(grid, lineOf(f))) (hexes[indexOf(grid, o)] as HexRecord).rail = true;

  const barrierLines = lines('water').filter(
    (f) =>
      /^(river|canal)$/.test(tags(f, 'waterway') ?? '') &&
      region.barrierRivers.includes(tags(f, 'name') ?? ''),
  );
  const rivers = indexLines(barrierLines.map((f) => ({ line: lineOf(f), name: tags(f, 'name') as string })));
  for (const name of region.barrierRivers) {
    if (!rivers.some((r) => r.name === name))
      console.log(`  warning: barrier river ${name} not found in the extent`);
  }
  const edgeRivers = markRiverEdges(grid, hexes, rivers);

  const crossingLines: CrossingLine[] = [];
  for (const f of [...lines('roads'), ...lines('rail'), ...lines('ferries')]) {
    if (tags(f, 'tunnel') !== undefined && tags(f, 'tunnel') !== 'no') continue;
    const kind = f.layer === 'ferries' ? 'ferry' : f.layer === 'rail' ? 'rail' : 'road';
    // Roads and railways only cross a river on a bridge; a crossing without one is a data error.
    if (kind !== 'ferry' && (tags(f, 'bridge') === undefined || tags(f, 'bridge') === 'no')) continue;
    const name = tags(f, 'bridge:name') ?? tags(f, 'name') ?? tags(f, 'ref') ?? '';
    crossingLines.push({ kind, name, osmId: f.id, line: lineOf(f) });
  }
  const usedIds = new Set<string>();
  const crossings = placeCrossings(
    grid,
    hexes,
    edgeRivers,
    findCrossingPoints(crossingLines, rivers).sort((a, b) => a.osmId.localeCompare(b.osmId)),
    region.crossingWindowKm,
    (c) => {
      const base = `${c.kind}-${slug(c.name || c.river)}`;
      let id = base;
      for (let n = 2; usedIds.has(id); n++) id = `${base}-${n}`;
      usedIds.add(id);
      return id;
    },
  );

  // Town names: the most important place in each hex.
  const places = projected
    .filter((f) => f.layer === 'places' && f.geometry.type === 'point' && tags(f, 'name'))
    .map((f) => ({
      name: tags(f, 'name') as string,
      kind: tags(f, 'place') as string,
      priority: PLACE_PRIORITY[tags(f, 'place') as string] ?? 9,
      at: (f.geometry as { point: Pt }).point,
      osmId: f.id,
    }))
    .sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name));
  for (const p of places) {
    const o = hexAt(grid, p.at);
    if (!o) continue;
    const h = hexes[indexOf(grid, o)] as HexRecord;
    if (p.priority <= 3) h.town ??= p.name;
  }

  // Objectives and zones.
  const anchors = resolveAnchors(region, crossings, toMap, grid);

  const map: HexMap = {
    version: 1,
    id: region.id,
    name: region.name,
    grid: {
      orientation: 'pointy',
      offset: 'odd-r',
      cols: grid.cols,
      rows: grid.rows,
      hexAcrossFlatsKm: region.grid.hexAcrossFlatsKm,
      origin: [round3(grid.layout.originX), round3(grid.layout.originY)],
    },
    elevationBandLowerBoundsM: region.elevation.bandLowerBoundsM,
    hexes,
    crossings,
    anchors,
    mainRoute: { via: region.mainRoute.via, note: region.mainRoute.note },
  };

  // Step 7: validation.
  console.log('Step 7: validation');
  const result = validateMap(map);
  for (const w of result.warnings) console.log(`  warning: ${w}`);
  report(map, overrideFile.todo);
  if (result.errors.length > 0) {
    const debugFile = join(CACHE, `${region.id}-hexes.invalid.json`);
    mkdirSync(CACHE, { recursive: true });
    writeFileSync(debugFile, JSON.stringify(map, null, 1));
    for (const e of result.errors) console.error(`  ERROR: ${e}`);
    throw new Error(
      `validation failed with ${result.errors.length} error(s); map written to ${debugFile} for inspection`,
    );
  }

  // Step 8: output.
  console.log('Step 8: output');
  const outDir = join(ROOT, 'data', 'maps', region.id);
  mkdirSync(outDir, { recursive: true });
  const clipBox: Box = { minX: -0.5, minY: -0.5, maxX: grid.widthKm + 0.5, maxY: grid.heightKm + 0.5 };
  const contourGrid = smooth(elevation, region.elevation.contourSmoothPasses);
  writeFileSync(join(outDir, 'hexes.json'), `${JSON.stringify(map)}\n`);
  writeFileSync(
    join(outDir, 'layers.geojson'),
    `${JSON.stringify(buildLayers(projected, crossings, contourGrid, region, clipBox, grid.heightKm))}\n`,
  );
  const labels = places.flatMap((p) => {
    const o = hexAt(grid, p.at);
    if (!o) return [];
    return [
      {
        name: p.name,
        kind: p.kind,
        priority: p.priority,
        at: [round3(p.at.x), round3(p.at.y)],
        hex: [o.col, o.row],
        osmId: p.osmId,
      },
    ];
  });
  writeFileSync(join(outDir, 'labels.json'), `${JSON.stringify(labels, null, 1)}\n`);
  const meta = {
    id: region.id,
    name: region.name,
    extentNote: region.extentNote,
    projection: region.projection,
    mapUnits: 'km, x east and y south from the north-west corner',
    originRD: region.originRD,
    sizeKm: [round3(grid.widthKm), round3(grid.heightKm)],
    wgs84Corners: {
      northWest: rounded(toLonLat({ x: 0, y: 0 })),
      northEast: rounded(toLonLat({ x: grid.widthKm, y: 0 })),
      southWest: rounded(toLonLat({ x: 0, y: grid.heightKm })),
      southEast: rounded(toLonLat({ x: grid.widthKm, y: grid.heightKm })),
    },
    sources: {
      openStreetMap: {
        attribution: '© OpenStreetMap contributors',
        licence: 'ODbL 1.0',
        url: 'https://www.openstreetmap.org/copyright',
        dataTimestamp: osmTimestamp,
      },
      elevation: {
        attribution: 'SRTM 1 arc-second (NASA/USGS), via the AWS Terrain Tiles open dataset',
        licence: 'Public domain',
      },
    },
    overrides: overrideFile.overrides.map((o) => ({
      id: o.id,
      action: o.action,
      applied: overridden.applied[o.id] ?? 0,
      source: o.source,
    })),
    todo: overrideFile.todo,
  };
  writeFileSync(join(outDir, 'meta.json'), `${JSON.stringify(meta, null, 2)}\n`);
  console.log(`Wrote ${outDir}`);
}

function rounded(ll: LonLat): [number, number] {
  return [Math.round(ll.lon * 1e6) / 1e6, Math.round(ll.lat * 1e6) / 1e6];
}

function resolveAnchors(
  region: Region,
  crossings: CrossingRecord[],
  toMap: (ll: LonLat) => Pt,
  grid: ReturnType<typeof makeGrid>,
): AnchorRecord[] {
  const out: AnchorRecord[] = [];
  const findCrossing = (spec: CrossingSpec): CrossingRecord | undefined => {
    const target = toMap({ lon: spec.near[0], lat: spec.near[1] });
    return crossings
      .filter((c) => c.kind === spec.kind && c.river === spec.river)
      .filter((c) => !spec.nameIncludes || c.name.includes(spec.nameIncludes))
      .sort(
        (a, b) =>
          Math.hypot(a.at[0] - target.x, a.at[1] - target.y) -
          Math.hypot(b.at[0] - target.x, b.at[1] - target.y),
      )[0];
  };
  for (const o of region.objectives) {
    const base = { id: o.id, name: o.name, kind: 'objective' as const, source: o.source };
    if (o.todo !== undefined || !o.crossing) {
      out.push({ ...base, todo: o.todo ?? 'TODO(history): no location' });
      continue;
    }
    const c = findCrossing(o.crossing);
    if (!c) {
      out.push(base);
      continue;
    }
    // The objective hex is the north (or west) bank hex of the crossing.
    out.push({ ...base, hex: c.banks[0], crossing: c.id });
  }
  for (const z of region.zones) {
    const base = {
      id: z.id,
      name: z.name,
      kind: 'zone' as const,
      source: z.source,
      ...(z.relation ? { relation: z.relation } : {}),
    };
    if (z.todo !== undefined) {
      out.push({ ...base, todo: z.todo });
      continue;
    }
    if (z.atObjective) {
      const obj = out.find((a) => a.id === z.atObjective?.id);
      const c = crossings.find((x) => x.id === obj?.crossing);
      if (c) out.push({ ...base, hex: z.atObjective.bank === 'north' ? c.banks[0] : c.banks[1] });
      else out.push(base);
      continue;
    }
    if (z.near) {
      const o = hexAt(grid, toMap({ lon: z.near[0], lat: z.near[1] }));
      out.push(o ? { ...base, hex: [o.col, o.row] } : base);
      continue;
    }
    out.push(base);
  }
  return out;
}

function buildLayers(
  features: MapFeature[],
  crossings: CrossingRecord[],
  contourGrid: ReturnType<typeof smooth>,
  region: Region,
  clipBox: Box,
  heightKm: number,
): unknown {
  const r = (p: Pt): [number, number] => [round3(p.x), round3(p.y)];
  const out: unknown[] = [];
  const push = (properties: Record<string, unknown>, geometry: unknown): void => {
    out.push({ type: 'Feature', properties, geometry });
  };
  const kindOf = (f: MapFeature): string | undefined => {
    const t = f.tags;
    if (f.layer === 'water')
      return f.geometry.type === 'polygon'
        ? 'water'
        : region.barrierRivers.includes(t['name'] ?? '')
          ? 'river'
          : 'waterway';
    if (f.layer === 'roads') return 'road';
    if (f.layer === 'rail') return 'rail';
    if (f.layer === 'ferries') return 'ferry';
    if (f.layer === 'landcover') {
      if (t['landuse'] === 'residential') return 'built-up';
      if (t['landuse'] === 'forest' || t['natural'] === 'wood') return 'woodland';
      if (t['natural'] === 'heath') return 'heath';
    }
    return undefined;
  };
  for (const f of [...features].sort((a, b) => a.id.localeCompare(b.id))) {
    const kind = kindOf(f);
    if (!kind) continue;
    const props: Record<string, unknown> = { layer: kind, osmId: f.id };
    if (f.tags['name']) props['name'] = f.tags['name'];
    if (kind === 'road') props['class'] = f.tags['highway'];
    if (f.tags['bridge'] && f.tags['bridge'] !== 'no') props['bridge'] = true;
    if (f.geometry.type === 'line') {
      for (const part of clipLine(f.geometry.line, clipBox))
        push(props, { type: 'LineString', coordinates: part.map(r) });
    } else if (f.geometry.type === 'polygon') {
      const rings = f.geometry.rings
        .map((ring) => clipRing(ring, clipBox))
        .filter((ring): ring is Pt[] => ring !== undefined);
      // Areas below the minimum are too small to draw at map scale (they still count for terrain).
      const area = rings.reduce((sum, ring) => sum + ringArea(ring), 0);
      if (rings.length > 0 && area >= region.layerMinAreaKm2) {
        push(props, { type: 'Polygon', coordinates: rings.map((ring) => ring.map(r)) });
      }
    }
  }
  const top = Math.max(...contourGrid.values);
  for (let level = region.elevation.contourMinM; level <= top; level += region.elevation.contourIntervalM) {
    for (const line of contour(contourGrid, level)) {
      for (const part of clipLine(simplify(line, region.simplifyToleranceM / 1000), clipBox)) {
        push({ layer: 'contour', elevationM: level }, { type: 'LineString', coordinates: part.map(r) });
      }
    }
  }
  for (const c of crossings) {
    push(
      { layer: 'crossing', id: c.id, kind: c.kind, name: c.name, river: c.river },
      { type: 'Point', coordinates: c.at },
    );
  }
  return {
    type: 'FeatureCollection',
    // Foreign member: coordinates are map km (x east, y south), not WGS84. See meta.json.
    coordinateSystem: { units: 'km', heightKm: round3(heightKm), yAxis: 'south' },
    features: out,
  };
}

function report(map: HexMap, todo: string[]): void {
  const counts = new Map<Terrain, number>();
  for (const h of map.hexes) counts.set(h.terrain, (counts.get(h.terrain) ?? 0) + 1);
  console.log('  terrain:', Object.fromEntries([...counts.entries()].sort((a, b) => b[1] - a[1])));
  console.log(
    `  road hexes: ${map.hexes.filter((h) => h.road).length}, rail hexes: ${map.hexes.filter((h) => h.rail).length}`,
  );
  console.log(`  river edges: ${map.hexes.reduce((s, h) => s + h.riverEdges.length, 0) / 2}`);
  console.log(`  crossings (${map.crossings.length}):`);
  for (const c of map.crossings)
    console.log(`    ${c.id} [${c.kind}] "${c.name}" over ${c.river}, banks ${JSON.stringify(c.banks)}`);
  for (const a of map.anchors)
    console.log(
      `  ${a.kind} ${a.id}: ${a.hex ? JSON.stringify(a.hex) : 'no hex'}${a.crossing ? ` (${a.crossing})` : ''}`,
    );
  for (const t of todo) console.log(`  todo: ${t}`);
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
