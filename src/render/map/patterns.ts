import { FillPattern, Matrix, Texture } from 'pixi.js';
import { createRng, nextFloat } from '../../core/rng';
import { MAP_INK } from './style';

/**
 * Small repeating textures for the period map symbols (PLAN 6.1 item 2): woodland as stippled
 * tree symbols, heath as tufts, polder as field strips, water as hatching. Drawn at twice the
 * world scale so they stay sharp in the baked map texture.
 */

const SCALE = 2;

function canvas(size: number): { c: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const c = document.createElement('canvas');
  c.width = size * SCALE;
  c.height = size * SCALE;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('2D canvas context is not available');
  ctx.scale(SCALE, SCALE);
  return { c, ctx };
}

function css(color: number, alpha = 1): string {
  return `rgba(${(color >> 16) & 0xff}, ${(color >> 8) & 0xff}, ${color & 0xff}, ${alpha})`;
}

function pattern(c: HTMLCanvasElement, rotation = 0): FillPattern {
  const p = new FillPattern(Texture.from(c), 'repeat');
  p.setTransform(new Matrix().scale(1 / SCALE, 1 / SCALE).rotate(rotation));
  return p;
}

/** Small round tree crowns with a shadow dot, scattered on a light green tint. */
export function woodlandPattern(): FillPattern {
  const size = 24;
  const { c, ctx } = canvas(size);
  ctx.fillStyle = css(MAP_INK.woodTint, 0.55);
  ctx.fillRect(0, 0, size, size);
  const rng = createRng(1944);
  for (let i = 0; i < 7; i++) {
    const x = nextFloat(rng) * size;
    const y = nextFloat(rng) * size;
    const r = 1.6 + nextFloat(rng) * 0.9;
    for (const [dx, dy] of [
      [0, 0],
      [size, 0],
      [0, size],
      [-size, 0],
      [0, -size],
    ] as const) {
      ctx.strokeStyle = css(MAP_INK.wood, 0.85);
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.arc(x + dx, y + dy, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = css(MAP_INK.wood, 0.9);
      ctx.fillRect(x + dx + r * 0.4, y + dy + r * 0.6, 0.7, 0.7);
    }
  }
  return pattern(c);
}

/** Heath tufts: small fans of three strokes. */
export function heathPattern(): FillPattern {
  const size = 20;
  const { c, ctx } = canvas(size);
  ctx.fillStyle = css(MAP_INK.heathTint, 0.45);
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = css(MAP_INK.heath, 0.9);
  ctx.lineWidth = 0.5;
  const tuft = (x: number, y: number): void => {
    for (const a of [-0.6, 0, 0.6]) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.sin(a) * 2.2, y - Math.cos(a) * 2.2);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(x - 1.6, y);
    ctx.lineTo(x + 1.6, y);
    ctx.stroke();
  };
  tuft(5, 7);
  tuft(15, 17);
  return pattern(c);
}

/** Fine parallel field strips with occasional ditches. */
export function polderPattern(rotation: number): FillPattern {
  const size = 16;
  const { c, ctx } = canvas(size);
  ctx.strokeStyle = css(MAP_INK.field, 0.35);
  ctx.lineWidth = 0.35;
  for (let y = 2; y < size; y += 4) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
    ctx.stroke();
  }
  return pattern(c, rotation);
}

/** Horizontal water hatching (shore lines are drawn separately). */
export function waterPattern(): FillPattern {
  const size = 8;
  const { c, ctx } = canvas(size);
  ctx.fillStyle = css(MAP_INK.waterTint, 0.8);
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = css(MAP_INK.water, 0.55);
  ctx.lineWidth = 0.4;
  for (const y of [1.5, 5.5]) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
    ctx.stroke();
  }
  return pattern(c);
}

/** Close diagonal hatching for built-up blocks. */
export function builtUpPattern(): FillPattern {
  const size = 6;
  const { c, ctx } = canvas(size);
  ctx.strokeStyle = css(MAP_INK.building, 0.7);
  ctx.lineWidth = 0.5;
  for (const o of [-size, 0, size]) {
    ctx.beginPath();
    ctx.moveTo(o, size);
    ctx.lineTo(o + size, 0);
    ctx.stroke();
  }
  return pattern(c);
}
