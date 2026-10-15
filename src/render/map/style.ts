/**
 * Ink colours and line weights for the period staff map (PLAN 6.1 item 2, 6.2). Sizes are in
 * world pixels; one map kilometre is PX_PER_KM world pixels.
 */

export const PX_PER_KM = 64;
/** Paper margin around the mapped area, for the grid numbers and the sheet furniture. */
export const SHEET_MARGIN_KM = 2.5;
/** Texels per world pixel in the baked map texture; higher stays sharp at closer zoom. */
export const BAKE_RESOLUTION = 2;
/** Baked tiles stay under the texture size every WebGL device supports. */
export const BAKE_TILE_PX = 2048;

export const MAP_INK = {
  contour: 0x9a6a3a,
  water: 0x3f6f8f,
  waterTint: 0xa8c2cc,
  road: 0xa0412d,
  roadMinor: 0xb86a4a,
  roadCasing: 0x3a2a1e,
  rail: 0x1e1a16,
  wood: 0x4f6b3a,
  woodTint: 0xb9c79a,
  heath: 0x7a5a6e,
  heathTint: 0xd8c8c8,
  field: 0x6f7a4a,
  building: 0x2a2219,
  grid: 0x3f6f9f,
  pencil: 0x55504a,
  label: 0x2a2219,
} as const;

export const ROAD_WIDTH: Record<string, number> = {
  trunk: 2.4,
  primary: 2.2,
  secondary: 1.7,
  tertiary: 1.1,
};
/** Largest building drawn, in metres along a side; bigger footprints are drawn this size. */
export const BUILDING_MAX_SIDE_M = 35;
/** Extra width of the dark road casing on each road. */
export const ROAD_CASING = 1;
/** Paper-coloured halo behind map labels, so names stay readable over buildings. */
export const LABEL_HALO = 3;
