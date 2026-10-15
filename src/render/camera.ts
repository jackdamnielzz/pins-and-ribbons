/**
 * Pure camera maths for the map table. screen = world * zoom + offset.
 * No PixiJS here so it can be unit-tested.
 */
export interface Camera {
  offsetX: number;
  offsetY: number;
  zoom: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CameraLimits {
  minZoom: number;
  maxZoom: number;
  /** Screen pixels of the sheet that must always stay inside the view. */
  keepVisible: number;
}

export const DEFAULT_LIMITS: CameraLimits = { minZoom: 0.2, maxZoom: 4, keepVisible: 120 };

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Camera that fits the whole rect in the view with the given screen padding. */
export function fitCamera(
  bounds: Rect,
  viewWidth: number,
  viewHeight: number,
  padding: number,
  limits: CameraLimits = DEFAULT_LIMITS,
): Camera {
  const availW = Math.max(1, viewWidth - 2 * padding);
  const availH = Math.max(1, viewHeight - 2 * padding);
  const zoom = clamp(Math.min(availW / bounds.width, availH / bounds.height), limits.minZoom, limits.maxZoom);
  return {
    zoom,
    offsetX: viewWidth / 2 - (bounds.x + bounds.width / 2) * zoom,
    offsetY: viewHeight / 2 - (bounds.y + bounds.height / 2) * zoom,
  };
}

export function screenToWorld(cam: Camera, sx: number, sy: number): { x: number; y: number } {
  return { x: (sx - cam.offsetX) / cam.zoom, y: (sy - cam.offsetY) / cam.zoom };
}

export function panBy(cam: Camera, dx: number, dy: number): Camera {
  return { ...cam, offsetX: cam.offsetX + dx, offsetY: cam.offsetY + dy };
}

/** Zooms by `factor` while keeping the world point under (sx, sy) fixed on screen. */
export function zoomAt(
  cam: Camera,
  sx: number,
  sy: number,
  factor: number,
  limits: CameraLimits = DEFAULT_LIMITS,
): Camera {
  const zoom = clamp(cam.zoom * factor, limits.minZoom, limits.maxZoom);
  const world = screenToWorld(cam, sx, sy);
  return { zoom, offsetX: sx - world.x * zoom, offsetY: sy - world.y * zoom };
}

/** Keeps at least `keepVisible` screen pixels of the sheet inside the view on each axis. */
export function constrain(
  cam: Camera,
  bounds: Rect,
  viewWidth: number,
  viewHeight: number,
  limits: CameraLimits = DEFAULT_LIMITS,
): Camera {
  const sheetW = bounds.width * cam.zoom;
  const sheetH = bounds.height * cam.zoom;
  const keepX = Math.min(limits.keepVisible, sheetW, viewWidth);
  const keepY = Math.min(limits.keepVisible, sheetH, viewHeight);
  const minX = keepX - (bounds.x + bounds.width) * cam.zoom;
  const maxX = viewWidth - keepX - bounds.x * cam.zoom;
  const minY = keepY - (bounds.y + bounds.height) * cam.zoom;
  const maxY = viewHeight - keepY - bounds.y * cam.zoom;
  return { zoom: cam.zoom, offsetX: clamp(cam.offsetX, minX, maxX), offsetY: clamp(cam.offsetY, minY, maxY) };
}
