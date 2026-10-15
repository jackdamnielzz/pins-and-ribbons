import { BlurFilter, Container, Graphics, Sprite, TilingSprite, type Application } from 'pixi.js';
import { constrain, fitCamera, panBy, zoomAt, type Camera, type Rect } from './camera';
import { PALETTE } from './palette';
import { createPaperTexture, createVignetteTexture, createWoodTexture } from './textures';

/** World units are pixels at zoom 1. The Island map is about 30 × 28 km (PLAN 5). */
const PX_PER_KM = 64;
const SHEET_MARGIN = 96;
export const SHEET: Rect = {
  x: 0,
  y: 0,
  width: 30 * PX_PER_KM + 2 * SHEET_MARGIN,
  height: 28 * PX_PER_KM + 2 * SHEET_MARGIN,
};

const FIT_PADDING = 64;
const WHEEL_ZOOM_SPEED = 0.0015;

/**
 * The map table scene: wood table, paper sheet with a soft shadow, and a lamp vignette.
 * Owns the camera and the pan/zoom input on the canvas.
 */
export class TableScene {
  private camera: Camera;
  private readonly table: TilingSprite;
  private readonly world = new Container();
  private readonly vignette: Sprite;

  constructor(private readonly app: Application) {
    this.table = new TilingSprite({ texture: createWoodTexture() });
    this.vignette = new Sprite(createVignetteTexture());

    const shadow = new Graphics()
      .rect(SHEET.x + 10, SHEET.y + 14, SHEET.width, SHEET.height)
      .fill({ color: 0x000000, alpha: 0.7 });
    shadow.filters = [new BlurFilter({ strength: 20, quality: 3 })];

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

    this.world.addChild(shadow, sheet, edge);
    app.stage.addChild(this.table, this.world, this.vignette);

    this.camera = fitCamera(SHEET, app.screen.width, app.screen.height, FIT_PADDING);
    this.layout();
    app.renderer.on('resize', () => this.layout());
    this.attachInput(app.canvas);
  }

  private setCamera(next: Camera): void {
    this.camera = constrain(next, SHEET, this.app.screen.width, this.app.screen.height);
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
}
