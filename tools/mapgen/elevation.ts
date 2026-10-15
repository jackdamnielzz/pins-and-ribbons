import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import type { Pt } from './geometry.ts';

/**
 * PLAN 9 step 3: elevation from SRTM 1 arc-second tiles (public domain, NASA/USGS), served
 * as .hgt.gz files by the AWS Terrain Tiles open dataset. Resampled to a 100 m grid.
 */

const TILE_URL = 'https://s3.amazonaws.com/elevation-tiles-prod/skadi';
const VOID = -32768;

export interface HgtTile {
  /** South-west corner, whole degrees. */
  lat: number;
  lon: number;
  /** Samples per side (3601 for 1 arc-second, 1201 for 3 arc-second). */
  size: number;
  data: Int16Array;
}

export function tileName(lat: number, lon: number): string {
  const ns = lat >= 0 ? 'N' : 'S';
  const ew = lon >= 0 ? 'E' : 'W';
  return `${ns}${String(Math.abs(lat)).padStart(2, '0')}${ew}${String(Math.abs(lon)).padStart(3, '0')}`;
}

/** Parses a raw .hgt file: big-endian int16 rows from north to south. */
export function parseHgt(buffer: Uint8Array, lat: number, lon: number): HgtTile {
  const count = buffer.length / 2;
  const size = Math.round(Math.sqrt(count));
  if (size * size !== count) throw new Error(`hgt ${tileName(lat, lon)}: unexpected length ${buffer.length}`);
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const data = new Int16Array(count);
  for (let i = 0; i < count; i++) data[i] = view.getInt16(i * 2, false);
  return { lat, lon, size, data };
}

export async function loadTile(
  cacheDir: string,
  lat: number,
  lon: number,
  options: { refresh: boolean; offline: boolean },
): Promise<HgtTile> {
  const name = tileName(lat, lon);
  const file = join(cacheDir, `${name}.hgt.gz`);
  if (options.refresh || !existsSync(file)) {
    if (options.offline) throw new Error(`SRTM tile ${name} is not cached and --offline is set`);
    const url = `${TILE_URL}/${name.slice(0, 3)}/${name}.hgt.gz`;
    console.log(`  fetching SRTM tile ${name}...`);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`SRTM download failed: ${response.status} ${url}`);
    mkdirSync(cacheDir, { recursive: true });
    writeFileSync(file, Buffer.from(await response.arrayBuffer()));
  }
  return parseHgt(gunzipSync(readFileSync(file)), lat, lon);
}

/** Bilinear elevation in metres, or undefined over voids or outside the tile. */
export function sampleTile(tile: HgtTile, lon: number, lat: number): number | undefined {
  const n = tile.size - 1;
  const fx = (lon - tile.lon) * n;
  const fy = (tile.lat + 1 - lat) * n;
  if (fx < 0 || fy < 0 || fx > n || fy > n) return undefined;
  const x0 = Math.min(Math.floor(fx), n - 1);
  const y0 = Math.min(Math.floor(fy), n - 1);
  const tx = fx - x0;
  const ty = fy - y0;
  const at = (x: number, y: number): number => tile.data[y * tile.size + x] as number;
  const v = [at(x0, y0), at(x0 + 1, y0), at(x0, y0 + 1), at(x0 + 1, y0 + 1)];
  if (v.some((h) => h === VOID)) return undefined;
  const [a, b, c, d] = v as [number, number, number, number];
  return a * (1 - tx) * (1 - ty) + b * tx * (1 - ty) + c * (1 - tx) * ty + d * tx * ty;
}

/** A regular grid over the map; cell (i, j) covers x ∈ [i·cell, (i+1)·cell) km, likewise y. */
export interface Grid {
  cols: number;
  rows: number;
  cellKm: number;
  values: Float32Array;
}

export function gridAt(g: Grid, i: number, j: number): number {
  return g.values[j * g.cols + i] as number;
}

/**
 * Resamples elevation onto a grid. `toLonLat` maps a map-km point to lon/lat.
 * Each cell averages `sub` × `sub` bilinear samples; voids fall back to the grid mean.
 */
export function resample(
  tiles: HgtTile[],
  widthKm: number,
  heightKm: number,
  cellKm: number,
  toLonLat: (p: Pt) => { lon: number; lat: number },
  sub = 4,
): Grid {
  const cols = Math.ceil(widthKm / cellKm);
  const rows = Math.ceil(heightKm / cellKm);
  const values = new Float32Array(cols * rows).fill(NaN);
  const find = (lon: number, lat: number): HgtTile | undefined =>
    tiles.find((t) => lon >= t.lon && lon <= t.lon + 1 && lat >= t.lat && lat <= t.lat + 1);
  let sum = 0;
  let count = 0;
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      let s = 0;
      let n = 0;
      for (let a = 0; a < sub; a++) {
        for (let b = 0; b < sub; b++) {
          const ll = toLonLat({ x: (i + (a + 0.5) / sub) * cellKm, y: (j + (b + 0.5) / sub) * cellKm });
          const tile = find(ll.lon, ll.lat);
          const h = tile ? sampleTile(tile, ll.lon, ll.lat) : undefined;
          if (h !== undefined) {
            s += h;
            n++;
          }
        }
      }
      if (n > 0) {
        values[j * cols + i] = s / n;
        sum += s / n;
        count++;
      }
    }
  }
  const mean = count > 0 ? sum / count : 0;
  for (let k = 0; k < values.length; k++) if (Number.isNaN(values[k])) values[k] = mean;
  return { cols, rows, cellKm, values };
}

/** 3 × 3 box blur, repeated `passes` times. Used only for contour lines. */
export function smooth(g: Grid, passes: number): Grid {
  let src = g.values;
  for (let p = 0; p < passes; p++) {
    const dst = new Float32Array(src.length);
    for (let j = 0; j < g.rows; j++) {
      for (let i = 0; i < g.cols; i++) {
        let s = 0;
        let n = 0;
        for (let dj = -1; dj <= 1; dj++) {
          for (let di = -1; di <= 1; di++) {
            const x = i + di;
            const y = j + dj;
            if (x < 0 || y < 0 || x >= g.cols || y >= g.rows) continue;
            s += src[y * g.cols + x] as number;
            n++;
          }
        }
        dst[j * g.cols + i] = s / n;
      }
    }
    src = dst;
  }
  return { ...g, values: src };
}

/**
 * Contour lines at `level` by marching squares over cell centres, joined into polylines.
 * Coordinates are map km.
 */
export function contour(g: Grid, level: number): Pt[][] {
  const segments: [Pt, Pt][] = [];
  const c = (i: number): number => (i + 0.5) * g.cellKm;
  const lerp = (a: number, b: number): number => (level - a) / (b - a);
  for (let j = 0; j < g.rows - 1; j++) {
    for (let i = 0; i < g.cols - 1; i++) {
      const tl = gridAt(g, i, j);
      const tr = gridAt(g, i + 1, j);
      const br = gridAt(g, i + 1, j + 1);
      const bl = gridAt(g, i, j + 1);
      const code =
        (tl >= level ? 8 : 0) | (tr >= level ? 4 : 0) | (br >= level ? 2 : 0) | (bl >= level ? 1 : 0);
      if (code === 0 || code === 15) continue;
      const top = { x: c(i) + lerp(tl, tr) * g.cellKm, y: c(j) };
      const right = { x: c(i + 1), y: c(j) + lerp(tr, br) * g.cellKm };
      const bottom = { x: c(i) + lerp(bl, br) * g.cellKm, y: c(j + 1) };
      const left = { x: c(i), y: c(j) + lerp(tl, bl) * g.cellKm };
      const centre = (tl + tr + br + bl) / 4;
      switch (code) {
        case 1:
        case 14:
          segments.push([left, bottom]);
          break;
        case 2:
        case 13:
          segments.push([bottom, right]);
          break;
        case 3:
        case 12:
          segments.push([left, right]);
          break;
        case 4:
        case 11:
          segments.push([top, right]);
          break;
        case 6:
        case 9:
          segments.push([top, bottom]);
          break;
        case 7:
        case 8:
          segments.push([left, top]);
          break;
        case 5:
          // Saddle: resolve with the centre value.
          if (centre >= level) segments.push([left, top], [bottom, right]);
          else segments.push([left, bottom], [top, right]);
          break;
        case 10:
          if (centre >= level) segments.push([left, bottom], [top, right]);
          else segments.push([left, top], [bottom, right]);
          break;
      }
    }
  }
  return joinSegments(segments);
}

/** Joins segments that share end points into polylines. */
export function joinSegments(segments: [Pt, Pt][]): Pt[][] {
  const key = (p: Pt): string => `${p.x.toFixed(6)},${p.y.toFixed(6)}`;
  const byEnd = new Map<string, number[]>();
  segments.forEach(([a, b], i) => {
    for (const p of [a, b]) {
      const k = key(p);
      const list = byEnd.get(k);
      if (list) list.push(i);
      else byEnd.set(k, [i]);
    }
  });
  const used = new Uint8Array(segments.length);
  const lines: Pt[][] = [];
  const extend = (line: Pt[]): void => {
    for (;;) {
      const end = line.at(-1) as Pt;
      const next = (byEnd.get(key(end)) ?? []).find((i) => !used[i]);
      if (next === undefined) return;
      used[next] = 1;
      const [a, b] = segments[next] as [Pt, Pt];
      line.push(key(a) === key(end) ? b : a);
    }
  };
  segments.forEach(([a, b], i) => {
    if (used[i]) return;
    used[i] = 1;
    const line = [a, b];
    extend(line);
    line.reverse();
    extend(line);
    lines.push(line);
  });
  return lines;
}
