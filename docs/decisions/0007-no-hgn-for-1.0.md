# 0007 — No HGN land use in version 1.0

Date: 2026-10-15
Status: Accepted (product owner)

## Context

Decision 0006 named HGN 1900/1960 (Historisch Grondgebruik Nederland, WUR) as the preferred source for 1944 heath and woodland. The files are only handed out through a request form.

## Decision

HGN is not needed for version 1.0. Woodland comes from today's OpenStreetMap. Heath comes from OpenStreetMap plus the sourced 1944 heath polygons on the Renkum and Ginkel drop zones (overrides file).

## Consequences

- Woodland planted or cleared after 1944 is not corrected. The drop zones, where it matters most, are covered by the sourced heath polygons.
- The HGN `TODO(history)` item is closed.
