# 0008 — Map renderer

Date: 2026-10-15
Status: Accepted

## Context

PLAN 9 asks for the map to be drawn once at load into a high-resolution texture in the period style of PLAN 6.1, with paper noise from a shader, and M1 asks for 60 fps while panning and a grid with map references.

## Decision

- **Bake once, in tiles.** The sheet (map layers, labels and furniture) is drawn as vector graphics and rendered once into 2048-pixel tiles at twice the world resolution (`BAKE_RESOLUTION`), then the vector geometry is freed. Panning only moves six sprites. Baking takes about 0.4–0.5 s, even on a software renderer.
- **Paper through the ink, without a shader.** The baked tiles sit on the generated paper texture with a multiply blend, so the paper grain shows through every line. This gives the effect the plan asked of a paper-noise shader with no custom GLSL/WGSL to maintain for both WebGL and WebGPU.
- **Symbols as pattern fills.** Woodland (tree crowns), heath (tufts), polder (field strips, one direction across all polder hexes so hex edges do not show), water (hatching) and settlement cores (diagonal hatching) are small procedural textures used as Pixi `FillPattern`s. 1944 buildings are drawn as small dark squares from BAG, larger than true scale and capped at 35 m.
- **Nord de Guerre grid.** Grid lines and references use EPSG:27500 (Lambert conformal conic, Plessis 1817 ellipsoid), with WGS84 latitude and longitude put in directly. There is no standard ATF–WGS84 datum shift, so the grid can be off by up to a few hundred metres against the original sheets. Lines are traced through many points because the grid is slightly turned and curved on this sheet.
- **Hover.** The hex under the cursor and its ring are pencilled in faintly (not baked), and a Preact paper slip shows terrain, road, railway, town and the six-figure map reference.
- **`?view=x,y,zoom`** opens the table centred on map km x, y at a given zoom, for checking details.

## Consequences

- The baked tiles take about 80 MB of texture memory.
- Road alignments are today's (without post-war motorways); see `docs/history/map.md`.
