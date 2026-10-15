# 0003 — Self-hosted fonts

Date: 2026-10-15
Status: Accepted

## Context

The four typefaces from PLAN 6.2 were loaded from Google's font servers (`fonts.googleapis.com` and `fonts.gstatic.com`). That has two problems:

- **Offline play for Steam.** The Tauri build must work without a network connection. Without one, every font fell back to a system face.
- **No third-party requests (GDPR).** Loading fonts from Google sends each player's IP address to a third party without consent. German courts have ruled this a GDPR breach (LG München I, 3 O 17493/20, 20 January 2022).

## Decision

- The fonts ship with the game as woff2 files in `assets/fonts/<family>/`, with each font's licence file next to them.
- The woff2 files are straight conversions of the TTF files in the [google/fonts](https://github.com/google/fonts) repository, with the full glyph set (not subset).
- `src/fonts.css` declares them with `@font-face`. Vite bundles them into the build.
- The game makes no requests to Google.
- Canvas text still waits for the fonts for at most 4 seconds (`src/render/fonts.ts`), then falls back to system faces.

## Consequences

- The fonts add about 330 KB to the build, all downloaded at startup.
- Licences are listed in `docs/licences.md`.
- The release build must ship the licence files alongside the fonts. This is tracked in `docs/licences.md`.
- Special Elite is licensed under Apache 2.0, not the OFL. PLAN 6.2 has been corrected.
