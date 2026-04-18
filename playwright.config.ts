import { defineConfig, devices } from '@playwright/test'

/**
 * Config Playwright pour tests E2E critiques (health, landing, auth guard).
 *
 * - Cible par défaut : http://localhost:3000 (start via npm run dev/start)
 * - Override : `PLAYWRIGHT_BASE_URL=https://seo-geo-orcin.vercel.app npm run test:e2e`
 * - Ne fait PAS de `webServer.command` car le build Next.js demande des env
 *   (DATABASE_URL, Stack Auth) — l'utilisateur / CI lance `npm run dev`
 *   ou `npm start` avant.
 * - Chromium only (suffisant pour smoke tests).
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Timeout global raisonnable pour un hot-reload/cold-start dev.
  timeout: 30_000,
  expect: { timeout: 10_000 },
})
