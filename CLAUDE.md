# Pins & Ribbons

Real-time-with-pause WWII strategy game on a 1944 map table. First scenario: Operation Market Garden. Target: Steam.
The full design and plan is in docs/PLAN.md. Read the relevant sections before starting any task.

## Rules
- Everything is in English: code, comments, data, UI text, commit messages, docs.
- Work on one milestone task at a time, in the order of docs/PLAN.md section 11.
- src/core and src/ai are pure TypeScript: no DOM, PixiJS, Preact, audio or platform imports. No Math.random or Date; use src/core/rng.ts.
- All tuning numbers live in data/rules.json; all player-facing text lives in src/i18n/en.json.
- Every core change comes with unit tests. Run `npm test` and `npm run lint` before you say a task is done.
- Historical facts (unit names, dates, places, terminology, tactics) come only from docs/history/. Never invent them. If a fact is missing, add a `TODO(history)` comment and list it in your summary.
- Ask before adding a runtime dependency.
- Keep commits small: one task per commit, conventional commit messages (feat:, fix:, refactor:, test:, docs:).
- When a decision changes the design, update docs/PLAN.md in the same commit and add a note in docs/decisions/.

## Commands
- npm run dev        start the browser build
- npm test           unit tests
- npm run lint       lint and type-check
- npm run mapgen     regenerate map data
- npm run balance    headless balance runner
