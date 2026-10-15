import tseslint from 'typescript-eslint';

// Packages that must never be imported by the simulation core or the AI (PLAN 8.1).
const forbiddenInCore = [
  { group: ['pixi.js', 'pixi.js/*', '@pixi/*'], message: 'src/core and src/ai must not import PixiJS.' },
  { group: ['preact', 'preact/*', '@preact/*'], message: 'src/core and src/ai must not import Preact.' },
  { group: ['howler', 'howler/*'], message: 'src/core and src/ai must not import audio code.' },
  { group: ['@tauri-apps/*'], message: 'src/core and src/ai must not import platform code.' },
  {
    group: [
      '**/render',
      '**/render/*',
      '**/ui',
      '**/ui/*',
      '**/audio',
      '**/audio/*',
      '**/platform',
      '**/platform/*',
    ],
    message: 'src/core and src/ai must not import render, UI, audio or platform modules.',
  },
];

// Browser globals that must not appear in core or AI code. tsconfig.core.json also drops the DOM lib.
const domGlobals = [
  'window',
  'document',
  'navigator',
  'location',
  'localStorage',
  'sessionStorage',
  'indexedDB',
  'fetch',
  'requestAnimationFrame',
  'setTimeout',
  'setInterval',
  'performance',
].map((name) => ({ name, message: 'src/core and src/ai must not use browser or timer globals.' }));

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'src-tauri', 'coverage'] },
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['src/core/**/*.ts', 'src/ai/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: forbiddenInCore }],
      'no-restricted-globals': [
        'error',
        ...domGlobals,
        { name: 'Date', message: 'Use game time from the state, not Date.' },
      ],
      'no-restricted-properties': [
        'error',
        { object: 'Math', property: 'random', message: 'Use src/core/rng.ts for randomness.' },
      ],
    },
  },
);
