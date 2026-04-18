import { expect, test } from '@playwright/test'

/**
 * Tests E2E smoke — chemins critiques de l'app.
 *
 * Pré-requis : serveur Next.js accessible sur `baseURL`. Soit :
 *   - `npm run dev` (local) sur :3000
 *   - deploy Vercel via `PLAYWRIGHT_BASE_URL=https://seo-geo-orcin.vercel.app`
 */

test.describe('Smoke tests production-ready', () => {
  test('GET /api/health → 200 JSON healthy', async ({ request }) => {
    const res = await request.get('/api/health')
    expect(res.status()).toBe(200)
    const json = await res.json()
    expect(json.status).toBe('healthy')
    expect(Array.isArray(json.checks)).toBe(true)
    const dbCheck = json.checks.find((c: { name: string }) => c.name === 'database')
    expect(dbCheck).toBeDefined()
  })

  test('GET / → landing accessible sans auth, h1 présent', async ({ page }) => {
    await page.goto('/')
    // On accepte 200 (landing) ou 302/307 vers /dashboard si l'utilisateur
    // est connecté (unlikely en CI, mais safe).
    await expect(page).toHaveURL(/\/($|dashboard)/)
    const h1 = page.locator('h1').first()
    await expect(h1).toBeVisible()
  })

  test('GET /dashboard non-authentifié → redirect /login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })

  test('headers de sécurité posés sur la home', async ({ request }) => {
    const res = await request.get('/')
    const headers = res.headers()
    expect(headers['content-security-policy']).toBeTruthy()
    expect(headers['content-security-policy']).toMatch(/object-src\s+'none'/i)
    expect(headers['x-frame-options'] || headers['content-security-policy']).toBeTruthy()
  })

  test('GET /api/cron/run-scheduled sans secret → 401', async ({ request }) => {
    const res = await request.get('/api/cron/run-scheduled')
    expect(res.status()).toBe(401)
  })

  test('GET /api/cron/run-scheduled avec mauvais secret → 401', async ({ request }) => {
    const res = await request.get('/api/cron/run-scheduled', {
      headers: { authorization: 'Bearer wrong-secret-12345' },
    })
    expect(res.status()).toBe(401)
  })
})
