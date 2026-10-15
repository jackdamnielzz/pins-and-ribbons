import { Container, Graphics, Rectangle, Sprite, Text, type FillPattern, type Renderer } from 'pixi.js';
import { hexCorners, layoutAcrossFlats, offsetToAxial, offset } from '../../core/hex/index.ts';
import { FONTS } from '../fonts';
import { PALETTE } from '../palette';
import type { LayerFeature, MapData, Position } from './data';
import { drawFurniture } from './furniture';
import { builtUpPattern, heathPattern, polderPattern, waterPattern, woodlandPattern } from './patterns';
import {
  BAKE_RESOLUTION,
  BAKE_TILE_PX,
  BUILDING_MAX_SIDE_M,
  LABEL_HALO,
  MAP_INK,
  PX_PER_KM,
  ROAD_CASING,
  ROAD_WIDTH,
  SHEET_MARGIN_KM,
} from './style';

/**
 * The map sheet (PLAN 6.1 item 2, PLAN 9): drawn once from the generated map data into a
 * container in world pixels, then baked into high-resolution tiles that sit on the paper
 * with a multiply blend, so paper grain shows through the ink.
 */

export interface SheetGeometry {
  /** Whole sheet including the margin, world pixels. */
  width: number;
  height: number;
  /** World pixel position of map km (0, 0). */
  mapX: number;
  mapY: number;
}

export function sheetGeometry(data: MapData): SheetGeometry {
  const { cols, rows, hexAcrossFlatsKm } = data.hexes.grid;
  const widthKm = (cols + 0.5) * hexAcrossFlatsKm;
  const heightKm = (hexAcrossFlatsKm / Math.sqrt(3)) * (1.5 * rows + 0.5);
  const margin = SHEET_MARGIN_KM * PX_PER_KM;
  return {
    width: widthKm * PX_PER_KM + 2 * margin,
    height: heightKm * PX_PER_KM + 2 * margin,
    mapX: margin,
    mapY: margin,
  };
}

/** Converts map km to sheet world pixels. */
export function kmToWorld(geo: SheetGeometry): (p: Position) => [number, number] {
  return ([x, y]) => [geo.mapX + x * PX_PER_KM, geo.mapY + y * PX_PER_KM];
}

/** Converts sheet world pixels back to map km. */
export function worldToKm(geo: SheetGeometry, wx: number, wy: number): { x: number; y: number } {
  return { x: (wx - geo.mapX) / PX_PER_KM, y: (wy - geo.mapY) / PX_PER_KM };
}

function flat(points: Position[], toWorld: (p: Position) => [number, number]): number[] {
  return points.flatMap((p) => toWorld(p));
}

function byLayer(data: MapData, layer: string): LayerFeature[] {
  return data.layers.filter((f) => f.properties.layer === layer);
}

function fillPolygons(
  g: Graphics,
  features: LayerFeature[],
  fill: FillPattern | { color: number; alpha: number },
  toWorld: (p: Position) => [number, number],
): void {
  for (const f of features) {
    if (f.geometry.type !== 'Polygon') continue;
    const [outer, ...holes] = f.geometry.coordinates;
    if (!outer) continue;
    g.poly(flat(outer, toWorld)).fill(fill);
    for (const hole of holes) g.poly(flat(hole, toWorld)).cut();
  }
}

function strokeLines(
  g: Graphics,
  features: LayerFeature[],
  style: { width: number; color: number; alpha?: number },
  toWorld: (p: Position) => [number, number],
): void {
  for (const f of features) {
    if (f.geometry.type !== 'LineString') continue;
    const pts = f.geometry.coordinates.map(toWorld);
    const first = pts[0];
    if (!first) continue;
    g.moveTo(first[0], first[1]);
    for (const p of pts.slice(1)) g.lineTo(p[0], p[1]);
  }
  g.stroke({ ...style, cap: 'round', join: 'round' });
}

/** Railway ticks: short cross strokes every `step` world pixels. */
function railTicks(g: Graphics, features: LayerFeature[], toWorld: (p: Position) => [number, number]): void {
  const step = 0.25 * PX_PER_KM;
  const half = 2.2;
  for (const f of features) {
    if (f.geometry.type !== 'LineString') continue;
    const pts = f.geometry.coordinates.map(toWorld);
    let carry = step / 2;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1] as [number, number];
      const b = pts[i] as [number, number];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (len === 0) continue;
      const ux = (b[0] - a[0]) / len;
      const uy = (b[1] - a[1]) / len;
      let s = carry;
      for (; s < len; s += step) {
        const x = a[0] + ux * s;
        const y = a[1] + uy * s;
        g.moveTo(x - uy * half, y + ux * half).lineTo(x + uy * half, y - ux * half);
      }
      carry = s - len;
    }
  }
  g.stroke({ width: 0.8, color: MAP_INK.rail });
}

function drawLand(data: MapData, geo: SheetGeometry, toWorld: (p: Position) => [number, number]): Graphics {
  const g = new Graphics();
  const { grid, hexes } = data.hexes;
  // Polder: field strips in the polder hexes, all one direction so hex edges do not show.
  const layout = layoutAcrossFlats(grid.hexAcrossFlatsKm, grid.origin[0], grid.origin[1]);
  const fields = polderPattern(0.35);
  for (const h of hexes) {
    if (h.terrain !== 'polder') continue;
    const corners = hexCorners(layout, offsetToAxial(offset(h.col, h.row)));
    g.poly(corners.flatMap((c) => toWorld([c.x, c.y]))).fill(fields);
  }
  fillPolygons(g, byLayer(data, 'heath'), heathPattern(), toWorld);
  fillPolygons(g, byLayer(data, 'heath-1944'), heathPattern(), toWorld);
  fillPolygons(g, byLayer(data, 'woodland'), woodlandPattern(), toWorld);
  void geo;
  return g;
}

function drawWater(data: MapData, toWorld: (p: Position) => [number, number]): Graphics {
  const g = new Graphics();
  const water = byLayer(data, 'water');
  fillPolygons(g, water, waterPattern(), toWorld);
  for (const f of water) {
    if (f.geometry.type !== 'Polygon') continue;
    for (const ring of f.geometry.coordinates) g.poly(flat(ring, toWorld));
  }
  g.stroke({ width: 0.9, color: MAP_INK.water, alpha: 0.9 });
  strokeLines(g, byLayer(data, 'waterway'), { width: 0.7, color: MAP_INK.water, alpha: 0.8 }, toWorld);
  strokeLines(g, byLayer(data, 'river'), { width: 1.4, color: MAP_INK.water }, toWorld);
  return g;
}

function drawContours(data: MapData, toWorld: (p: Position) => [number, number]): Graphics {
  const g = new Graphics();
  const contours = byLayer(data, 'contour');
  const major = contours.filter((f) => (f.properties.elevationM ?? 0) % 50 === 0);
  const minor = contours.filter((f) => (f.properties.elevationM ?? 0) % 50 !== 0);
  strokeLines(g, minor, { width: 0.6, color: MAP_INK.contour, alpha: 0.55 }, toWorld);
  strokeLines(g, major, { width: 1.1, color: MAP_INK.contour, alpha: 0.75 }, toWorld);
  return g;
}

function drawSettlements(
  data: MapData,
  geo: SheetGeometry,
  toWorld: (p: Position) => [number, number],
): Graphics {
  const g = new Graphics();
  fillPolygons(g, byLayer(data, 'settlement-core-1944'), builtUpPattern(), toWorld);
  const cells = data.buildings;
  for (let i = 0; i + 2 < cells.length; i += 3) {
    const [x, y] = toWorld([(cells[i] as number) / 1000, (cells[i + 1] as number) / 1000]);
    // Small footprints are drawn larger than true scale, as on a 1:100,000 sheet; very large
    // ones (factories, churches) are capped so they do not read as black blocks.
    const sideM = Math.min(cells[i + 2] as number, BUILDING_MAX_SIDE_M);
    const side = Math.max(1.4, (sideM / 1000) * PX_PER_KM * 1.6);
    g.rect(x - side / 2, y - side / 2, side, side);
  }
  g.fill({ color: MAP_INK.building, alpha: 0.85 });
  void geo;
  return g;
}

function drawTransport(data: MapData, toWorld: (p: Position) => [number, number]): Graphics {
  const g = new Graphics();
  const rail = byLayer(data, 'rail');
  strokeLines(g, rail, { width: 1.3, color: MAP_INK.rail }, toWorld);
  railTicks(g, rail, toWorld);
  const roads = byLayer(data, 'road');
  const classes = ['tertiary', 'secondary', 'primary', 'trunk'];
  for (const cls of classes) {
    const width = ROAD_WIDTH[cls] ?? 1.5;
    strokeLines(
      g,
      roads.filter((f) => f.properties.class === cls),
      { width: width + ROAD_CASING, color: MAP_INK.roadCasing },
      toWorld,
    );
  }
  for (const cls of classes) {
    const width = ROAD_WIDTH[cls] ?? 1.5;
    const color = cls === 'tertiary' ? MAP_INK.roadMinor : MAP_INK.road;
    strokeLines(
      g,
      roads.filter((f) => f.properties.class === cls),
      { width, color },
      toWorld,
    );
  }
  return g;
}

const LABEL_SIZE: Record<number, number> = { 1: 22, 2: 15, 3: 11.5, 4: 9 };

/** Place names, most important first; a name that would overlap one already placed is left out. */
function drawLabels(data: MapData, toWorld: (p: Position) => [number, number]): Container {
  const c = new Container();
  const placed: Rectangle[] = [];
  for (const label of [...data.labels].sort((a, b) => a.priority - b.priority)) {
    const size = LABEL_SIZE[label.priority] ?? 9;
    const text = new Text({
      text: label.priority <= 2 ? label.name.toUpperCase() : label.name,
      style: {
        fontFamily: FONTS.mapLabel,
        fontSize: size,
        fill: MAP_INK.label,
        letterSpacing: label.priority <= 2 ? size * 0.12 : 0,
        fontStyle: label.priority >= 4 ? 'italic' : 'normal',
        stroke: { color: PALETTE.paper, width: LABEL_HALO, join: 'round' },
      },
      resolution: BAKE_RESOLUTION * 2,
    });
    const [x, y] = toWorld(label.at);
    text.anchor.set(0, 0.5);
    text.position.set(x + 4, y);
    const box = new Rectangle(text.x - 2, text.y - text.height / 2 - 2, text.width + 4, text.height + 4);
    if (placed.some((r) => r.intersects(box))) {
      text.destroy();
      continue;
    }
    placed.push(box);
    c.addChild(text);
  }
  return c;
}

/** Everything printed on the sheet, in world pixels, before baking. */
export function drawSheetContent(data: MapData, geo: SheetGeometry): Container {
  const toWorld = kmToWorld(geo);
  const content = new Container();
  content.addChild(
    drawLand(data, geo, toWorld),
    drawContours(data, toWorld),
    drawWater(data, toWorld),
    drawSettlements(data, geo, toWorld),
    drawTransport(data, toWorld),
    drawLabels(data, toWorld),
    drawFurniture(data, geo),
  );
  return content;
}

/**
 * Renders `content` once into tiles at BAKE_RESOLUTION and returns sprites in its place.
 * The vector content is destroyed afterwards; the baked textures (and the small label textures) stay.
 */
export function bake(renderer: Renderer, content: Container, geo: SheetGeometry): Container {
  const started = performance.now();
  const out = new Container();
  for (let y = 0; y < geo.height; y += BAKE_TILE_PX / BAKE_RESOLUTION) {
    for (let x = 0; x < geo.width; x += BAKE_TILE_PX / BAKE_RESOLUTION) {
      const w = Math.min(BAKE_TILE_PX / BAKE_RESOLUTION, geo.width - x);
      const h = Math.min(BAKE_TILE_PX / BAKE_RESOLUTION, geo.height - y);
      const texture = renderer.generateTexture({
        target: content,
        frame: new Rectangle(x, y, w, h),
        resolution: BAKE_RESOLUTION,
        antialias: true,
      });
      const sprite = new Sprite(texture);
      sprite.position.set(x, y);
      sprite.blendMode = 'multiply';
      out.addChild(sprite);
    }
  }
  // Free the vector geometry, which is most of the memory. Label textures stay: the renderer
  // keeps them in cached bind groups, and destroying them there only produces warnings.
  const graphics: Graphics[] = [];
  const collect = (c: Container): void => {
    for (const child of c.children) {
      if (child instanceof Graphics) graphics.push(child);
      else collect(child);
    }
  };
  collect(content);
  for (const g of graphics) g.destroy();
  if (import.meta.env.DEV) console.info(`map baked in ${Math.round(performance.now() - started)} ms`);
  return out;
}
