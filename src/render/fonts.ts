/**
 * Typefaces from PLAN 6.2, loaded from Google Fonts in index.html.
 * Each stack falls back to similar system faces if the web font is unavailable.
 * The stacks work as CSS `font-family` values and as PixiJS `fontFamily` values.
 */
export const FONTS = {
  /** Titles and unit names. */
  stencil: "'Stardos Stencil', 'Stencil Std', Stencil, 'Courier New', serif",
  /** Typewriter text and signals. */
  typewriter: "'Special Elite', 'American Typewriter', 'Courier New', Courier, monospace",
  /** Map labels. */
  mapLabel: "'IM Fell English', 'Iowan Old Style', Garamond, 'Times New Roman', serif",
  /** Pencil annotations. */
  pencil: "'Reenie Beanie', 'Bradley Hand', 'Segoe Print', 'Comic Sans MS', cursive",
} as const;

/** Every face index.html requests, in CSS `font` shorthand for `FontFaceSet.load`. */
export const FONT_FACES = [
  "400 16px 'Stardos Stencil'",
  "700 16px 'Stardos Stencil'",
  "400 16px 'Special Elite'",
  "400 16px 'IM Fell English'",
  "italic 400 16px 'IM Fell English'",
  "400 16px 'Reenie Beanie'",
] as const;

/** Canvas text is not drawn until the fonts are in, but never waits longer than this. */
const FONT_LOAD_TIMEOUT_MS = 4000;

type FontLoader = Pick<FontFaceSet, 'load'>;

/**
 * Resolves once every face is loaded, has failed, or the timeout has passed.
 * Canvas text (PixiJS Text) is rasterised once, so it must not be created before this,
 * or it stays in the fallback face. Never rejects: offline play falls back to system fonts.
 */
export function loadFonts(
  fonts: FontLoader = document.fonts,
  timeoutMs: number = FONT_LOAD_TIMEOUT_MS,
): Promise<void> {
  const loads = Promise.allSettled(FONT_FACES.map((face) => fonts.load(face))).then(() => undefined);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, timeoutMs);
  });
  return Promise.race([loads, timeout]).finally(() => clearTimeout(timer));
}

/** Publishes the stacks as CSS custom properties so the DOM UI uses the same fonts. */
export function applyFontVariables(root: HTMLElement = document.documentElement): void {
  root.style.setProperty('--font-stencil', FONTS.stencil);
  root.style.setProperty('--font-typewriter', FONTS.typewriter);
  root.style.setProperty('--font-map-label', FONTS.mapLabel);
  root.style.setProperty('--font-pencil', FONTS.pencil);
}
