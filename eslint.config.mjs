// ESLint 9 flat config — measure-only (max-file-lines warn).
// Deliberately does NOT enable eslint:recommended / type-aware TS rules
// (would flood the hub). Scope expansion = separate hygiene backlog item.
//
// Usage: pnpm lint:measure

import tseslint from 'typescript-eslint';
import cursorKitGates from './tooling/eslint-rules/index.cjs';

const maxLinesRule = [
  'warn',
  { max: Number(process.env.MAX_LINES || 350), skipBlankLines: true, skipComments: false },
];

export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.next/**',
      '**/coverage/**',
      '_archive/**',
    ],
  },
  {
    files: ['**/*.{js,mjs,cjs,ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      'cursor-kit-gates': cursorKitGates,
    },
    rules: {
      // Present so existing `eslint-disable @typescript-eslint/no-var-requires` comments resolve.
      '@typescript-eslint/no-var-requires': 'off',
      'cursor-kit-gates/max-file-lines': maxLinesRule,
    },
  },
];
