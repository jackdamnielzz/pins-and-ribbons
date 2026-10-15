# 0006 — 1944 land cover and crossings in the map generator

Date: 2026-10-15
Status: Accepted

## Context

The first generated map used today's OpenStreetMap land cover and every bridge in OpenStreetMap. That made about a fifth of the map built-up (post-war districts and suburbs), turned the Renkum Heath drop zones into farmland, and kept bridges that did not exist in 1944.

## Decision

- **Built-up area** comes from BAG building footprints (Kadaster, via PDOK) with a construction year of 1944 or earlier. A hex is built-up when those footprints cover at least **2 %** of it. A village core easily passes that; scattered farms (around ten farms of 500 m² is about 0.6 %) stay below it. Today's residential areas from OpenStreetMap are no longer used.
- **Settlement cores.** The centres of Arnhem and Nijmegen were largely destroyed in 1944 and rebuilt, so BAG gives them post-war years. Sourced `cover` polygons in the overrides file (CBS district and neighbourhood outlines) mark them built-up; a hex is built-up when at least half of it lies inside one.
- **Heath and woodland.** HGN 1900 and 1960 (WUR) were the preferred source, but the files are only handed out through a request form, so they are not used. Woodland and heath still come from today's OpenStreetMap. The drop zones on Renkum Heath and Ginkel Heath get sourced 1944 heath polygons in the overrides file: the convex hull of sourced points on each heath, widened by 600 m (a design choice). A hex at least half inside one is heath.
- **Crossings.** Only crossings listed in the region file with a 1944 source are kept; every other bridge or ferry found in OpenStreetMap is dropped and reported. Each crossing records its state at the start of the scenario: `intact`, `damaged`, `blown` or `not-in-service`, and what happened to it later. Only intact crossings carry the main road. Crossings not in OpenStreetMap (the Arnhem pontoon bridge) are placed from a sourced point.
- **Banks** of a crossing are ordered north bank first, or west bank first where the river runs north–south, by the side of the river each bank hex lies on.
- **Main road.** The main-road check follows the Club Route waypoints from the sources (Grave bridge, Heumen bridge, Nijmegen road bridge, Elst, Arnhem road bridge) and stores the hexes it finds in `hexes.json` as `mainRoute.hexes`.

## Consequences

- Built-up area fell from 219 to 65 hexes. Small 1944 villages that fall across hex boundaries can drop below the threshold.
- BAG covers the Netherlands only; German villages on the map are not built-up (TODO(history)).
- All historical facts behind these rules are in `docs/history/map.md`.
