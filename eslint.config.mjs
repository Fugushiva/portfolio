// Flat config — ESLint 9 + Next.js 15 use this format.
// Bridges legacy `extends:` configs (next/core-web-vitals, jsx-a11y) via FlatCompat.

import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { FlatCompat } from '@eslint/eslintrc'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const compat = new FlatCompat({ baseDirectory: __dirname })

const config = [
  // Next.js a11y + perf rules (typescript, react-hooks, jsx-a11y included).
  ...compat.extends('next/core-web-vitals', 'next/typescript'),

  // Strict jsx-a11y on top — catches the audit findings we just fixed
  // (invalid roles, click-on-noninteractive, anchor/button labels, etc.).
  ...compat.extends('plugin:jsx-a11y/strict'),

  {
    rules: {
      // jsx-a11y customizations — keep strict except where the project's
      // motion components legitimately need a different shape.
      'jsx-a11y/no-autofocus': ['error', { ignoreNonDOM: true }],

      // The stretched-button pattern in Work.tsx keeps `<a>` inside a header
      // overlay. Real <button> nesting is already eliminated, but Next/Link
      // children sometimes confuse this rule.
      'jsx-a11y/anchor-is-valid': ['warn', {
        components: ['Link'],
        specialLink: ['hrefLeft', 'hrefRight'],
        aspects: ['invalidHref', 'preferButton'],
      }],

      // React 19 + Next 15: explicit any is still discouraged but framer-motion
      // type seams sometimes require it. Warn (not error) keeps CI green.
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },

  {
    // Generated / vendored / build output — never lint.
    ignores: [
      '.next/**',
      'node_modules/**',
      'out/**',
      'public/**',
      'graphify-out/**',
      'coverage/**',
      '.playwright-mcp/**',
      'next-env.d.ts',
    ],
  },
]

export default config
