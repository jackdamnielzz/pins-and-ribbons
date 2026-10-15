import { Texture } from 'pixi.js';
import { createRng, nextFloat, type RngState } from '../core/rng';
import { PALETTE } from './palette';

/**
 * Procedural table and paper textures (PLAN 6: assets are generated in code).
 * Both tiles wrap seamlessly so they can be used with a TilingSprite.
 */

const TAU = Math.PI * 2;

function makeCanvas(size: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas context is not available');
  return { canvas, ctx };
}

function toByte(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}

/** Dark oak planks with horizontal grain. */
export function createWoodTexture(seed = 1944, size = 512, plankHeight = 128): Texture {
  const { canvas, ctx } = makeCanvas(size);
  const rng = createRng(seed);
  const image = ctx.createImageData(size, size);
  const [r0, g0, b0] = PALETTE.oak;

  const planks = Math.ceil(size / plankHeight);
  const plankTone = Array.from({ length: planks }, () => 0.85 + nextFloat(rng) * 0.25);
  const plankPhase = Array.from({ length: planks }, () => nextFloat(rng) * TAU);
  const k1 = 37; // grain frequencies: whole cycles per tile so the texture wraps
  const k2 = 9;

  for (let y = 0; y < size; y++) {
    const plank = Math.floor(y / plankHeight);
    const tone = plankTone[plank] ?? 1;
    const phase = plankPhase[plank] ?? 0;
    const inPlank = y % plankHeight;
    const seam = inPlank < 2 ? 0.45 : inPlank < 4 ? 0.8 : 1;
    for (let x = 0; x < size; x++) {
      const u = (x / size) * TAU;
      const warp = 7 * Math.sin(u + phase) + 3 * Math.sin(2 * u + phase * 1.7);
      const v = ((y + warp) / size) * TAU;
      const grain = 0.6 * Math.sin(k1 * v + phase) + 0.4 * Math.sin(k2 * v + phase * 0.5);
      const noise = (nextFloat(rng) - 0.5) * 0.08;
      const shade = tone * seam * (0.92 + grain * 0.12 + noise);
      const i = (y * size + x) * 4;
      image.data[i] = toByte(r0 * shade);
      image.data[i + 1] = toByte(g0 * shade);
      image.data[i + 2] = toByte(b0 * shade);
      image.data[i + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  return Texture.from(canvas);
}

/** Off-white staff-map paper with fine grain and faint mottling. */
export function createPaperTexture(seed = 17, size = 512): Texture {
  const { canvas, ctx } = makeCanvas(size);
  const rng: RngState = createRng(seed);
  const image = ctx.createImageData(size, size);
  const r0 = (PALETTE.paper >> 16) & 0xff;
  const g0 = (PALETTE.paper >> 8) & 0xff;
  const b0 = PALETTE.paper & 0xff;
  const p1 = nextFloat(rng) * TAU;
  const p2 = nextFloat(rng) * TAU;

  for (let y = 0; y < size; y++) {
    const v = (y / size) * TAU;
    for (let x = 0; x < size; x++) {
      const u = (x / size) * TAU;
      const mottle = 0.01 * Math.sin(3 * u + p1) * Math.sin(2 * v + p2);
      const noise = (nextFloat(rng) - 0.5) * 0.05;
      const shade = 1 + mottle + noise;
      const i = (y * size + x) * 4;
      image.data[i] = toByte(r0 * shade);
      image.data[i + 1] = toByte(g0 * shade);
      image.data[i + 2] = toByte(b0 * shade * 0.995);
      image.data[i + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  return Texture.from(canvas);
}

/** Radial lamp pool: clear in the centre, dark at the edges. Stretched over the screen. */
export function createVignetteTexture(size = 512): Texture {
  const { canvas, ctx } = makeCanvas(size);
  const half = size / 2;
  const gradient = ctx.createRadialGradient(half, half, size * 0.18, half, half, size * 0.72);
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
  gradient.addColorStop(0.35, 'rgba(0, 0, 0, 0.05)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0.72)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return Texture.from(canvas);
}
