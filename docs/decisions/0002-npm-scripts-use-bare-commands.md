# 0002 — npm scripts use bare command names

Date: 2026-10-15
Status: Accepted. Supersedes [0001](0001-npm-scripts-call-node.md)

## Context

The working folder has been renamed to `pins-and-ribbons`, as PLAN section 8.2 lays out. Without the `&` in the path, the `node_modules/.bin` shims work again on Windows.

## Decision

`package.json` scripts call the tools by name again (`vite`, `vitest`, `eslint`, `tsc`, `prettier`).

## Consequences

- Scripts are short and read like any other npm project.
- The project must not be checked out under a path that contains `&` on Windows. If it is, npm scripts fail with "is not recognized" errors from `cmd.exe`.
