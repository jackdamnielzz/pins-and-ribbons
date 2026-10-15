# 0005 — The Island map extent and hex model

Date: 2026-10-15
Status: Accepted

## Context

PLAN 5 described the map as "about 30 × 28 km, from Heelsum in the west to Pannerden in the east, and from north of Arnhem to Groesbeek and Overasselt in the south". The named places do not fit that size: Ginkel Heath (DZ Y) lies about 6 km north of Heelsum, and DZ N lies south of Groesbeek, while Heelsum to Pannerden is only about 20 km. Building the map generator (PLAN 9) also needed some details the plan left open.

## Decision

- **Extent.** The map follows the named places, not the size: RD New x 176–201.5 km and y 417–452 km, which is 25 × 40 hexes, about 25.5 × 35 km. PLAN 5 now says "about 25 × 35 km".
- **Rivers are hex edges.** An edge is a river edge when the line between the two hex centres crosses a barrier river (Nederrijn, Waal, Pannerdensch Kanaal, Bijlandsch Kanaal, Maas–Waal canal, Maas, IJssel). This makes every river a continuous barrier by construction. A hex is river terrain only when at least half of it is water.
- **Crossings.** A bridge or ferry is placed on the river edges its line crosses, or on the water hexes it spans (those become bridge terrain). An edge can carry more than one crossing, because the Nijmegen road and rail bridges are only about 1 km apart. Road and rail crossings count only where OSM marks the way as a bridge.
- **Road flag.** Only trunk, primary and secondary roads set a hex's road flag, as PLAN 9 step 2 asks. Tertiary roads are drawn in `layers.geojson` but do not set the flag; with them, about two thirds of all hexes were road hexes.
- **Overrides** either remove OSM features by tag (optionally inside an area) or include features from an opt-in layer. Ferries are opt-in, because most of today's ferries did not run in 1944.
- **Objectives and zones** are anchored in `tools/mapgen/regions/the-island.json` and written to `hexes.json`. They are reference hexes for validation. The exact zone hexes still belong in the scenario file (PLAN 5).
- **Main road check.** A road path must run from the south edge over the Nijmegen road bridge and then the Arnhem road bridge, in that order.

## Consequences

- The map is taller than the plan assumed (40 rows instead of about 32).
- Narrow rivers block movement through hex edges, so units on either bank stay in normal land hexes.
