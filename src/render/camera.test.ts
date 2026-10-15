import { describe, expect, it } from 'vitest';
import { constrain, fitCamera, panBy, screenToWorld, zoomAt, type CameraLimits, type Rect } from './camera';

const sheet: Rect = { x: 0, y: 0, width: 2000, height: 1000 };
const limits: CameraLimits = { minZoom: 0.2, maxZoom: 4, keepVisible: 100 };

describe('camera', () => {
  it('fits the sheet centred in the view', () => {
    const cam = fitCamera(sheet, 1200, 800, 100, limits);
    expect(cam.zoom).toBeCloseTo(0.5);
    const centre = screenToWorld(cam, 600, 400);
    expect(centre.x).toBeCloseTo(1000);
    expect(centre.y).toBeCloseTo(500);
  });

  it('pans by screen pixels', () => {
    const cam = panBy({ offsetX: 10, offsetY: 20, zoom: 2 }, 5, -5);
    expect(cam).toEqual({ offsetX: 15, offsetY: 15, zoom: 2 });
  });

  it('keeps the world point under the cursor fixed while zooming', () => {
    const cam = { offsetX: 37, offsetY: -12, zoom: 0.8 };
    const before = screenToWorld(cam, 300, 250);
    const zoomed = zoomAt(cam, 300, 250, 1.5, limits);
    const after = screenToWorld(zoomed, 300, 250);
    expect(zoomed.zoom).toBeCloseTo(1.2);
    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
  });

  it('clamps zoom to the limits', () => {
    const cam = { offsetX: 0, offsetY: 0, zoom: 1 };
    expect(zoomAt(cam, 0, 0, 100, limits).zoom).toBe(4);
    expect(zoomAt(cam, 0, 0, 0.001, limits).zoom).toBe(0.2);
  });

  it('stops the sheet from being dragged out of view', () => {
    const view = { w: 1200, h: 800 };
    const farRight = constrain({ offsetX: 99_999, offsetY: 0, zoom: 1 }, sheet, view.w, view.h, limits);
    expect(farRight.offsetX).toBe(view.w - 100);
    const farLeft = constrain({ offsetX: -99_999, offsetY: 0, zoom: 1 }, sheet, view.w, view.h, limits);
    expect(farLeft.offsetX + sheet.width).toBe(100);
    const farDown = constrain({ offsetX: 0, offsetY: 99_999, zoom: 1 }, sheet, view.w, view.h, limits);
    expect(farDown.offsetY).toBe(view.h - 100);
  });

  it('leaves an in-range camera unchanged', () => {
    const cam = fitCamera(sheet, 1200, 800, 100, limits);
    expect(constrain(cam, sheet, 1200, 800, limits)).toEqual(cam);
  });
});
