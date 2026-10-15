import { Container, Graphics, Text } from 'pixi.js';
import { hexToPixel, offset, offsetToAxial } from '../../core/hex/index.ts';
import { mapLayout } from '../../core/map/lookup.ts';
import { gridToMap, mapToGrid, type MapPoint } from '../../core/map/reference.ts';
import { createRng, nextFloat, type RngState } from '../../core/rng';
import { t } from '../../i18n';
import { FONTS } from '../fonts';
import type { MapData, Position } from './data';
import { kmToWorld, type SheetGeometry } from './sheet';
import { BAKE_RESOLUTION, MAP_INK, PX_PER_KM } from './style';

/**
 * Map furniture (PLAN 6.1 item 3): the blue 1 km Nord de Guerre grid with its numbers, the
 * neatline, cartouche, scale bar, north arrow, fold lines, coffee stains and pencil notes for
 * the landing zones and the Club Route. Drawn into the sheet before it is baked.
 */

const TEXT_RESOLUTION = BAKE_RESOLUTION * 2;

function text(value: string, fontFamily: string, fontSize: number, fill: number, extra: object = {}): Text {
  return new Text({
    text: value,
    style: { fontFamily, fontSize, fill, ...extra },
    resolution: TEXT_RESOLUTION,
  });
}

interface MapFrame {
  widthKm: number;
  heightKm: number;
}

function frameOf(data: MapData): MapFrame {
  const { cols, rows, hexAcrossFlatsKm } = data.hexes.grid;
  return {
    widthKm: (cols + 0.5) * hexAcrossFlatsKm,
    heightKm: (hexAcrossFlatsKm / Math.sqrt(3)) * (1.5 * rows + 0.5),
  };
}

function inside(p: MapPoint, f: MapFrame): boolean {
  return p.x >= 0 && p.y >= 0 && p.x <= f.widthKm && p.y <= f.heightKm;
}

/**
 * The 1 km grid. Grid lines are straight in Nord de Guerre metres but slightly turned and
 * curved on this sheet, so each line is traced through many points and clipped to the map.
 */
function drawGrid(data: MapData, geo: SheetGeometry): Container {
  const c = new Container();
  const g = new Graphics();
  const frame = frameOf(data);
  const toWorld = kmToWorld(geo);
  const corners = [
    { x: 0, y: 0 },
    { x: frame.widthKm, y: 0 },
    { x: 0, y: frame.heightKm },
    { x: frame.widthKm, y: frame.heightKm },
  ].map((p) => mapToGrid(p, data.originRD));
  const e0 = Math.floor(Math.min(...corners.map((p) => p.easting)) / 1000) - 1;
  const e1 = Math.ceil(Math.max(...corners.map((p) => p.easting)) / 1000) + 1;
  const n0 = Math.floor(Math.min(...corners.map((p) => p.northing)) / 1000) - 1;
  const n1 = Math.ceil(Math.max(...corners.map((p) => p.northing)) / 1000) + 1;
  const step = 0.1;
  const numbers: { value: number; at: MapPoint; side: 'top' | 'bottom' | 'left' | 'right' }[] = [];

  const trace = (points: MapPoint[], value: number, along: 'easting' | 'northing'): void => {
    let pen = false;
    let first: MapPoint | undefined;
    let last: MapPoint | undefined;
    for (const p of points) {
      if (!inside(p, frame)) {
        pen = false;
        continue;
      }
      const [x, y] = toWorld([p.x, p.y]);
      if (pen) g.lineTo(x, y);
      else g.moveTo(x, y);
      pen = true;
      first ??= p;
      last = p;
    }
    if (!first || !last) return;
    if (along === 'easting') {
      numbers.push({ value, at: first.y < last.y ? first : last, side: 'top' });
      numbers.push({ value, at: first.y < last.y ? last : first, side: 'bottom' });
    } else {
      numbers.push({ value, at: first.x < last.x ? first : last, side: 'left' });
      numbers.push({ value, at: first.x < last.x ? last : first, side: 'right' });
    }
  };

  for (let e = e0; e <= e1; e++) {
    const pts: MapPoint[] = [];
    for (let n = n0; n <= n1; n += step)
      pts.push(gridToMap({ easting: e * 1000, northing: n * 1000 }, data.originRD));
    trace(pts, e, 'easting');
  }
  for (let n = n0; n <= n1; n++) {
    const pts: MapPoint[] = [];
    for (let e = e0; e <= e1; e += step)
      pts.push(gridToMap({ easting: e * 1000, northing: n * 1000 }, data.originRD));
    trace(pts, n, 'northing');
  }
  g.stroke({ width: 0.7, color: MAP_INK.grid, alpha: 0.7 });
  c.addChild(g);

  // Two-figure grid numbers in the margin: the km digits within the 100 km square.
  for (const n of numbers) {
    const label = text(
      String(((n.value % 100) + 100) % 100).padStart(2, '0'),
      FONTS.typewriter,
      11,
      MAP_INK.grid,
    );
    const [x, y] = toWorld([n.at.x, n.at.y]);
    const gap = 6;
    const place = {
      top: { ax: 0.5, ay: 1, dx: 0, dy: -gap },
      bottom: { ax: 0.5, ay: 0, dx: 0, dy: gap },
      left: { ax: 1, ay: 0.5, dx: -gap, dy: 0 },
      right: { ax: 0, ay: 0.5, dx: gap, dy: 0 },
    }[n.side];
    label.anchor.set(place.ax, place.ay);
    label.position.set(x + place.dx, y + place.dy);
    c.addChild(label);
  }
  return c;
}

/** Double neatline around the mapped area. */
function drawNeatline(data: MapData, geo: SheetGeometry): Graphics {
  const f = frameOf(data);
  const w = f.widthKm * PX_PER_KM;
  const h = f.heightKm * PX_PER_KM;
  return new Graphics()
    .rect(geo.mapX, geo.mapY, w, h)
    .stroke({ width: 1.2, color: MAP_INK.label })
    .rect(geo.mapX - 5, geo.mapY - 5, w + 10, h + 10)
    .stroke({ width: 2.4, color: MAP_INK.label });
}

function drawCartouche(data: MapData, geo: SheetGeometry): Container {
  const c = new Container();
  const f = frameOf(data);
  const bottom = geo.mapY + f.heightKm * PX_PER_KM;
  const title = text(t('map.cartouche').toUpperCase(), FONTS.stencil, 22, MAP_INK.label, {
    letterSpacing: 2,
  });
  title.anchor.set(0.5, 0);
  title.position.set(geo.width / 2, bottom + 34);
  const note = text(t('map.gridNote'), FONTS.typewriter, 11, MAP_INK.grid);
  note.anchor.set(0.5, 0);
  note.position.set(geo.width / 2, bottom + 64);
  c.addChild(title, note);
  return c;
}

function drawScaleBar(data: MapData, geo: SheetGeometry): Container {
  const c = new Container();
  const f = frameOf(data);
  const x0 = geo.mapX;
  const y0 = geo.mapY + f.heightKm * PX_PER_KM + 40;
  const g = new Graphics();
  for (let k = 0; k < 5; k++) {
    g.rect(x0 + k * PX_PER_KM, y0, PX_PER_KM, 6);
    if (k % 2 === 0) g.fill({ color: MAP_INK.label });
  }
  g.rect(x0, y0, 5 * PX_PER_KM, 6).stroke({ width: 1, color: MAP_INK.label });
  c.addChild(g);
  for (let k = 0; k <= 5; k++) {
    const n = text(String(k), FONTS.typewriter, 10, MAP_INK.label);
    n.anchor.set(0.5, 0);
    n.position.set(x0 + k * PX_PER_KM, y0 + 9);
    c.addChild(n);
  }
  const unit = text(t('map.scaleUnit'), FONTS.typewriter, 10, MAP_INK.label);
  unit.anchor.set(0.5, 0);
  unit.position.set(x0 + 2.5 * PX_PER_KM, y0 + 24);
  c.addChild(unit);
  return c;
}

function drawNorthArrow(data: MapData, geo: SheetGeometry): Container {
  const c = new Container();
  const f = frameOf(data);
  const x = geo.mapX + f.widthKm * PX_PER_KM - 30;
  const y = geo.mapY + f.heightKm * PX_PER_KM + 34;
  const g = new Graphics()
    .poly([x, y, x - 9, y + 34, x, y + 26, x + 9, y + 34])
    .fill({ color: MAP_INK.label })
    .poly([x, y, x + 9, y + 34, x, y + 26])
    .fill({ color: 0xffffff, alpha: 0.6 })
    .poly([x, y, x - 9, y + 34, x, y + 26, x + 9, y + 34])
    .stroke({ width: 1, color: MAP_INK.label });
  const n = text(t('map.north'), FONTS.stencil, 14, MAP_INK.label);
  n.anchor.set(0.5, 1);
  n.position.set(x, y - 2);
  c.addChild(g, n);
  return c;
}

/** The sheet was folded in six panels: two columns, three rows. */
function drawFolds(geo: SheetGeometry): Graphics {
  const g = new Graphics();
  g.moveTo(geo.width / 2, 0).lineTo(geo.width / 2, geo.height);
  for (const k of [1, 2]) g.moveTo(0, (geo.height * k) / 3).lineTo(geo.width, (geo.height * k) / 3);
  g.stroke({ width: 3, color: MAP_INK.label, alpha: 0.05 });
  g.moveTo(geo.width / 2 + 1, 0).lineTo(geo.width / 2 + 1, geo.height);
  for (const k of [1, 2]) g.moveTo(0, (geo.height * k) / 3 + 1).lineTo(geo.width, (geo.height * k) / 3 + 1);
  g.stroke({ width: 0.8, color: MAP_INK.label, alpha: 0.12 });
  return g;
}

/** Faint rings left by a coffee cup. */
function drawCoffeeStains(geo: SheetGeometry, rng: RngState): Graphics {
  const g = new Graphics();
  const stains = [
    { x: geo.width * 0.86, y: geo.height * 0.93, r: 46 },
    { x: geo.width * 0.08, y: geo.height * 0.04, r: 40 },
  ];
  for (const s of stains) {
    for (let i = 0; i < 6; i++) {
      const wobble = (nextFloat(rng) - 0.5) * 3;
      g.circle(s.x + wobble, s.y - wobble, s.r + i * 0.8).stroke({
        width: 1 + nextFloat(rng) * 2.5,
        color: 0x7a4a22,
        alpha: 0.05 + nextFloat(rng) * 0.06,
      });
    }
    g.circle(s.x, s.y, s.r).fill({ color: 0x7a4a22, alpha: 0.025 });
  }
  return g;
}

/** "LZ S" becomes "LZ 'S'", as pencilled on the 1944 maps (PLAN 6.1). */
export function pencilZoneName(name: string): string {
  const m = /^(LZ|DZ) (\w+)$/.exec(name);
  if (m) return `${m[1]} '${m[2]}'`;
  return name.replace(/ \(.*\)$/, '');
}

function pencilLine(g: Graphics, points: [number, number][], rng: RngState, dashed: boolean): void {
  for (let pass = 0; pass < 2; pass++) {
    const jitter = (): number => (nextFloat(rng) - 0.5) * 0.8;
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1] as [number, number];
      const b = points[i] as [number, number];
      if (dashed && i % 2 === 0) continue;
      g.moveTo(a[0] + jitter(), a[1] + jitter()).lineTo(b[0] + jitter(), b[1] + jitter());
    }
  }
  g.stroke({ width: 1, color: MAP_INK.pencil, alpha: 0.55, cap: 'round' });
}

/** Chaikin smoothing so the route reads as a hand-drawn line, not a chain of hex centres. */
function smooth(points: [number, number][], passes: number): [number, number][] {
  let pts = points;
  for (let p = 0; p < passes; p++) {
    const out: [number, number][] = [pts[0] as [number, number]];
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1] as [number, number];
      const b = pts[i] as [number, number];
      out.push(
        [a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25],
        [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75],
      );
    }
    out.push(pts.at(-1) as [number, number]);
    pts = out;
  }
  return pts;
}

/** Split a polyline into short pieces so every other one can be left out as a dash. */
function dashes(points: [number, number][], length: number): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1] as [number, number];
    const b = points[i] as [number, number];
    const n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / length));
    for (let k = 0; k < n; k++) out.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
  }
  out.push(points.at(-1) as [number, number]);
  return out;
}

function drawPencil(data: MapData, geo: SheetGeometry, rng: RngState): Container {
  const c = new Container();
  const g = new Graphics();
  const toWorld = kmToWorld(geo);
  const layout = mapLayout(data.hexes);
  const centre = (h: Position): [number, number] => {
    const p = hexToPixel(layout, offsetToAxial(offset(h[0], h[1])));
    return toWorld([p.x, p.y]);
  };

  // Landing and drop zones: a pencilled ring and the zone names. Zones that share an
  // anchor hex share one ring and one note.
  const byHex = new Map<string, { hex: Position; names: string[] }>();
  for (const a of data.hexes.anchors) {
    if (a.kind !== 'zone' || !a.hex) continue;
    const key = `${a.hex[0]},${a.hex[1]}`;
    const entry = byHex.get(key) ?? { hex: a.hex, names: [] };
    entry.names.push(pencilZoneName(a.name));
    byHex.set(key, entry);
  }
  for (const { hex, names } of byHex.values()) {
    const [x, y] = centre(hex);
    const r = 0.75 * PX_PER_KM;
    const ring: [number, number][] = [];
    for (let k = 0; k <= 24; k++) {
      const ang = (k / 24) * Math.PI * 2;
      const rr = r * (1 + (nextFloat(rng) - 0.5) * 0.06);
      ring.push([x + Math.cos(ang) * rr, y + Math.sin(ang) * rr * 0.85]);
    }
    pencilLine(g, ring, rng, false);
    const label = text(names.join(' · '), FONTS.pencil, 20, MAP_INK.pencil);
    label.anchor.set(0.5, 1);
    label.position.set(x, y - r * 0.85 - 2);
    label.rotation = (nextFloat(rng) - 0.5) * 0.12;
    label.alpha = 0.8;
    c.addChild(label);
  }

  // The XXX Corps axis along the stored main route.
  const route = data.hexes.mainRoute.hexes.map(centre);
  if (route.length > 1) {
    pencilLine(g, dashes(smooth(route, 3), 7), rng, true);
    const mid = route[Math.floor(route.length * 0.55)] as [number, number];
    const label = text(t('map.clubRoute'), FONTS.pencil, 24, MAP_INK.pencil);
    label.anchor.set(0, 0.5);
    label.position.set(mid[0] + 14, mid[1]);
    label.rotation = -0.25;
    label.alpha = 0.85;
    c.addChild(label);
  }
  c.addChildAt(g, 0);
  return c;
}

export function drawFurniture(data: MapData, geo: SheetGeometry): Container {
  const rng = createRng(17091944);
  const c = new Container();
  c.addChild(
    drawFolds(geo),
    drawGrid(data, geo),
    drawNeatline(data, geo),
    drawCartouche(data, geo),
    drawScaleBar(data, geo),
    drawNorthArrow(data, geo),
    drawPencil(data, geo, rng),
    drawCoffeeStains(geo, rng),
  );
  return c;
}
