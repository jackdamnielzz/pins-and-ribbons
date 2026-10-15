import { Container, Graphics, Sprite, TilingSprite, type Application } from 'pixi.js';
import { constrain, fitCamera, panBy, screenToWorld, zoomAt, type Camera, type Rect } from './camera';
import { hexCorners, hexToPixel, neighbours, offset, offsetToAxial } from '../core/hex/index.ts';
import { hexAtPoint, mapLayout } from '../core/map/lookup.ts';
import { gridReference } from '../core/map/reference.ts';
import type { HexRecord } from '../core/map/types.ts';
import type { MapData } from './map/data';
import { bake, drawSheetContent, sheetGeometry, worldToKm, type SheetGeometry } from './map/sheet';
import { MAP_INK, PX_PER_KM } from './map/style';
import { PALETTE } from './palette';
import { createPaperTexture, createShadow, createVignetteTexture, createWoodTexture } from './textures';

const FIT_PADDING = 64;

export interface HoverEvent {
  hex: HexRecord;
  reference: string;
  /** Cursor in CSS pixels relative to the canvas. */
  x: number;
  y: number;
}

export interface TableOptions {
  /** Called when the cursor moves onto another hex, or off the map (null). */
  onHover?: (event: HoverEvent | null) => void;
  /** Start view: centre in map km and zoom, for example from `?view=14.9,9.4,2`. */
  view?: { x: number; y: number; zoom: number };
}
const WHEEL_ZOOM_SPEED = 0.0015;

/**
 * The map table scene: wood table, paper sheet with a soft shadow, and a lamp vignette.
 * Owns the camera and the pan/zoom input on the canvas.
 */
export class TableScene {
  private camera: Camera;
  private readonly sheetRect: Rect;
  private readonly table: TilingSprite;
  private readonly world = new Container();
  private readonly vignette: Sprite;
  private readonly geo: SheetGeometry;
  private readonly hoverOutline = new Graphics();
  private hovered: HexRecord | undefined;

  constructor(
    private readonly app: Application,
    private readonly data: MapData,
    private readonly options: TableOptions = {},
  ) {
    const geo = sheetGeometry(data);
    this.geo = geo;
    const SHEET: Rect = { x: 0, y: 0, width: geo.width, height: geo.height };
    this.sheetRect = SHEET;
    this.table = new TilingSprite({ texture: createWoodTexture() });
    this.vignette = new Sprite(createVignetteTexture());

    // Pre-blurred once; a live blur filter would cost a pass every frame.
    const soft = createShadow(SHEET.width, SHEET.height, 40);
    const shadow = new Sprite(soft.texture);
    shadow.scale.set(soft.scale);
    shadow.position.set(SHEET.x + 10 - soft.margin, SHEET.y + 14 - soft.margin);

    const sheet = new TilingSprite({
      texture: createPaperTexture(),
      width: SHEET.width,
      height: SHEET.height,
    });
    sheet.position.set(SHEET.x, SHEET.y);

    const edge = new Graphics()
      .rect(SHEET.x + 1, SHEET.y + 1, SHEET.width - 2, SHEET.height - 2)
      .stroke({ color: PALETTE.ink, alpha: 0.18, width: 2 })
      .rect(SHEET.x + 6, SHEET.y + 6, SHEET.width - 12, SHEET.height - 12)
      .stroke({ color: PALETTE.ink, alpha: 0.05, width: 10 });

    const map = bake(app.renderer, drawSheetContent(data, geo), geo);

    this.world.addChild(shadow, sheet, map, edge, this.hoverOutline);
    app.stage.addChild(this.table, this.world, this.vignette);

    this.camera = fitCamera(SHEET, app.screen.width, app.screen.height, FIT_PADDING);
    const view = options.view;
    if (view) {
      this.camera = {
        zoom: view.zoom,
        offsetX: app.screen.width / 2 - (geo.mapX + view.x * PX_PER_KM) * view.zoom,
        offsetY: app.screen.height / 2 - (geo.mapY + view.y * PX_PER_KM) * view.zoom,
      };
    }
    this.layout();
    app.renderer.on('resize', () => this.layout());
    this.attachInput(app.canvas);
  }

  private setCamera(next: Camera): void {
    this.camera = constrain(next, this.sheetRect, this.app.screen.width, this.app.screen.height);
    this.applyCamera();
  }

  private applyCamera(): void {
    const { offsetX, offsetY, zoom } = this.camera;
    this.world.position.set(offsetX, offsetY);
    this.world.scale.set(zoom);
    // The table moves with the sheet but tiles forever, so it never runs out.
    this.table.tilePosition.set(offsetX, offsetY);
    this.table.tileScale.set(zoom);
  }

  private layout(): void {
    const { width, height } = this.app.screen;
    this.table.width = width;
    this.table.height = height;
    this.vignette.width = width;
    this.vignette.height = height;
    this.setCamera(this.camera);
  }

  private attachInput(canvas: HTMLCanvasElement): void {
    let dragging: { id: number; x: number; y: number } | null = null;

    canvas.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 && e.button !== 1) return;
      dragging = { id: e.pointerId, x: e.clientX, y: e.clientY };
      canvas.setPointerCapture(e.pointerId);
      canvas.style.cursor = 'grabbing';
    });

    canvas.addEventListener('pointermove', (e) => {
      if (!dragging) this.updateHover(canvas, e);
      if (!dragging || e.pointerId !== dragging.id) return;
      const dx = e.clientX - dragging.x;
      const dy = e.clientY - dragging.y;
      dragging = { id: e.pointerId, x: e.clientX, y: e.clientY };
      this.setCamera(panBy(this.camera, dx, dy));
    });

    const endDrag = (e: PointerEvent): void => {
      if (!dragging || e.pointerId !== dragging.id) return;
      dragging = null;
      canvas.style.cursor = 'grab';
    };
    canvas.addEventListener('pointerleave', () => this.setHover(undefined, 0, 0));
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);

    canvas.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const factor = Math.exp(-e.deltaY * WHEEL_ZOOM_SPEED);
        this.setCamera(zoomAt(this.camera, e.clientX - rect.left, e.clientY - rect.top, factor));
      },
      { passive: false },
    );

    canvas.style.cursor = 'grab';
  }

  /** The hex under the cursor, in map km via the camera and sheet geometry. */
  private updateHover(canvas: HTMLCanvasElement, e: PointerEvent): void {
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const world = screenToWorld(this.camera, sx, sy);
    const km = worldToKm(this.geo, world.x, world.y);
    const hex = hexAtPoint(this.data.hexes, mapLayout(this.data.hexes), km.x, km.y);
    this.setHover(hex, sx, sy);
  }

  private setHover(hex: HexRecord | undefined, sx: number, sy: number): void {
    if (hex !== this.hovered) {
      this.hovered = hex;
      this.drawHoverOutline(hex);
    }
    if (!hex) {
      this.options.onHover?.(null);
      return;
    }
    const layout = mapLayout(this.data.hexes);
    const centre = hexToPixel(layout, offsetToAxial(offset(hex.col, hex.row)));
    this.options.onHover?.({ hex, reference: gridReference(centre, this.data.originRD), x: sx, y: sy });
  }

  /** Faint pencil hexes around the cursor (PLAN 6.1 item 4): the hex itself and its ring. */
  private drawHoverOutline(hex: HexRecord | undefined): void {
    const g = this.hoverOutline;
    g.clear();
    if (!hex) return;
    const layout = mapLayout(this.data.hexes);
    const toWorld = (p: { x: number; y: number }): number[] => [
      this.geo.mapX + p.x * PX_PER_KM,
      this.geo.mapY + p.y * PX_PER_KM,
    ];
    const at = offsetToAxial(offset(hex.col, hex.row));
    for (const n of neighbours(at)) g.poly(hexCorners(layout, n).flatMap(toWorld));
    g.stroke({ width: 0.8, color: MAP_INK.pencil, alpha: 0.25 });
    g.poly(hexCorners(layout, at).flatMap(toWorld)).stroke({ width: 1.4, color: MAP_INK.pencil, alpha: 0.7 });
  }
}
