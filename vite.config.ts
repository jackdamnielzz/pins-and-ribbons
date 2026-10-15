/// <reference types="vitest/config" />
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { defineConfig, type Plugin } from 'vite';

const FONTS_DIR = join(import.meta.dirname, 'assets', 'fonts');
const LICENCE_FILE = /^(OFL|LICENSE).*\.txt$/;

/** The font family folder (assets/fonts/<family>/) a source file sits in, if any. */
function fontFamilyOf(path: string): string | undefined {
  const rel = relative(FONTS_DIR, join(import.meta.dirname, path)).split(sep);
  return rel.length === 2 && rel[0] !== '..' ? rel[0] : undefined;
}

/**
 * Keeps each font in its own assets/fonts/<family>/ folder in the build and copies
 * the font's licence file next to it, as the OFL and Apache 2.0 require (decision 0003).
 */
function fontLicences(): Plugin {
  return {
    name: 'font-licences',
    generateBundle(_options, bundle) {
      const families = new Set<string>();
      for (const fileName of Object.keys(bundle)) {
        const match = /^assets\/fonts\/([^/]+)\//.exec(fileName);
        if (match?.[1]) families.add(match[1]);
      }
      for (const family of families) {
        for (const name of readdirSync(join(FONTS_DIR, family)).filter((n) => LICENCE_FILE.test(n))) {
          this.emitFile({
            type: 'asset',
            fileName: `assets/fonts/${family}/${name}`,
            source: readFileSync(join(FONTS_DIR, family, name)),
          });
        }
      }
    },
  };
}

export default defineConfig({
  // Preact JSX without an extra Vite plugin.
  oxc: {
    jsx: { runtime: 'automatic', importSource: 'preact' },
  },
  plugins: [fontLicences()],
  build: {
    rollupOptions: {
      output: {
        assetFileNames: (asset) => {
          const family = asset.originalFileNames.map(fontFamilyOf).find((f) => f !== undefined);
          return family ? `assets/fonts/${family}/[name]-[hash][extname]` : 'assets/[name]-[hash][extname]';
        },
      },
    },
  },
  test: {
    include: ['src/**/*.test.ts', 'tools/**/*.test.ts'],
    environment: 'node',
  },
});
