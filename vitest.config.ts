import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['**/*.{test,spec}.{ts,tsx}'],
    // Exclure les tests E2E Playwright qui vivent dans tests/e2e/ —
    // ils tournent via `npm run test:e2e` (un process séparé).
    exclude: ['**/node_modules/**', '**/dist/**', '**/.next/**', 'tests/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        '.next/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
        'drizzle/**',
        // UI pages : testées via E2E Playwright, pas de seuil unit.
        'app/**/page.tsx',
        'app/**/layout.tsx',
        'app/**/loading.tsx',
        'app/**/error.tsx',
        'components/**',
        // Worker bootstrap : testé manuellement (process lifecycle).
        'worker/index.ts',
        // Instrumentation Sentry : third-party, rien à tester.
        'instrumentation*.ts',
        'sentry.*.config.ts',
      ],
      thresholds: {
        lines: 60,
        functions: 60,
        branches: 55,
        statements: 60,
        // Seuils renforcés sur les zones critiques.
        'lib/security/**': {
          lines: 85,
          functions: 85,
          branches: 75,
          statements: 85,
        },
        'lib/audit/phases/**': {
          lines: 80,
          functions: 80,
          branches: 70,
          statements: 80,
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})
