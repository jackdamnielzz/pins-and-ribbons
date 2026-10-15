# 0001 — npm scripts call tools through node

Date: 2026-10-15
Status: Superseded by [0002](0002-npm-scripts-use-bare-commands.md)

## Context

The working folder is `pins & ribbons`. On Windows, npm runs scripts through `cmd.exe`, and the shims in `node_modules/.bin/*.cmd` break on the `&` in the path ("'ribbons\node_modules\.bin\' is not recognized").

## Decision

`package.json` scripts call each tool's entry file with `node` (for example `node node_modules/vite/bin/vite.js`) instead of the bare command name. This works in any folder name and on every OS, including CI.

## Consequences

- Scripts are longer but behave the same.
- If the folder is renamed to `pins-and-ribbons` (PLAN section 2), the scripts can go back to bare command names. That is optional.
