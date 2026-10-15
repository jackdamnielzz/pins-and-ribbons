# 0004 — Node runs the TypeScript tools directly

Date: 2026-10-15
Status: Accepted

## Context

`tools/mapgen` (and later `tools/balance`) are Node scripts written in TypeScript, and they use `src/core` (for example the hex module). They need to run with `npm run mapgen` without a build step or an extra runner such as `tsx`, which would be a new dependency.

Node 22.18 and later strip TypeScript types natively. Node does not guess file extensions for ES modules, so imports must name the `.ts` file, and the code may only use TypeScript syntax that can be erased (no `enum`, `namespace` or constructor parameter properties).

## Decision

- `npm run mapgen` runs `node tools/mapgen/index.ts`.
- Code that Node runs (`tools/`, `src/core`, `src/ai`) imports with explicit `.ts` extensions. The `allowImportingTsExtensions` option is on in every tsconfig, and `erasableSyntaxOnly` is on in `tsconfig.core.json` and `tsconfig.node.json`, so the type-check catches anything Node could not run.
- `tsconfig.node.json` now type-checks `tools/` as well as `vite.config.ts`.
- `engines.node` is raised to `>=22.18.0`.

## Consequences

- No runner dependency. Tools start fast and use the same core code as the game.
- Browser-only code (`src/render`, `src/ui`) can keep extensionless imports; Vite resolves both styles.
