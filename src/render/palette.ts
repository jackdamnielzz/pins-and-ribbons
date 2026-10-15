/** Colour tokens from PLAN 6.2, plus the table colours used by the renderer. */
export const PALETTE = {
  paper: 0xece2c6,
  ink: 0x2a2219,
  ribbonRed: 0xb3232b,
  brass: 0xc8a35a,
  water: 0xa8c2cc,
  /** Dark oak base colour for the generated table texture. */
  oak: [58, 38, 24] as const,
  /** Colour behind the canvas while it loads. */
  tableBackground: 0x140d08,
} as const;
