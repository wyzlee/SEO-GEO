import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  serverExternalPackages: ['jose', '@sparticuz/chromium', 'puppeteer-core', '@anthropic-ai/sdk'],
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  async headers() {
    // Content-Security-Policy en mode Report-Only (non-enforced).
    // Objectif : observer les violations pendant 30j avant passage en enforced.
    // Sources vérifiées dans le code :
    //   - Sentry : tunnel local /monitoring + ingest.de.sentry.io (EU endpoint)
    //   - Stack Auth : api.stack-auth.com (JWKS + auth côté client)
    //   - Upstash : *.upstash.io (Redis REST rate-limiting)
    //   - Vercel Analytics : vitals.vercel-insights.com
    //   - Fonts : next/font/google auto-héberge Fira Code → 'self' suffit
    //     Cabinet Grotesk est déjà local → 'self'
    //   - Stripe : billing via redirect server-side (pas de js.stripe.com client)
    //   - Perplexity / CrUX / Wikidata : server-side only → absent du connect-src
    const cspValue = [
      "default-src 'self'",
      // Next.js génère des scripts inline (RSC, hydration chunks) → unsafe-inline requis.
      // unsafe-eval requis par certains loaders en dev ; acceptable en Report-Only V1.
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      // Styles inline générés par Tailwind / next-themes → unsafe-inline requis.
      "style-src 'self' 'unsafe-inline'",
      // Fonts auto-hébergées via next/font → 'self' suffit.
      "font-src 'self' data:",
      // Images : logos utilisateurs, avatars, og-images, blob pour exports.
      "img-src 'self' data: blob: https:",
      // Requêtes XHR/fetch côté client :
      //   - /monitoring = tunnel Sentry local (tunnelRoute next.config.ts)
      //   - ingest.de.sentry.io = fallback direct Sentry EU
      //   - api.stack-auth.com = JWKS validation + refresh token
      //   - *.upstash.io = Redis REST (rate-limit check)
      //   - vitals.vercel-insights.com = Web Vitals Vercel
      "connect-src 'self' https://o4510861777698816.ingest.de.sentry.io https://api.stack-auth.com https://*.upstash.io https://vitals.vercel-insights.com",
      // Pas d'iframes : Stack Auth utilise des popups (COOP: same-origin-allow-popups).
      "frame-src 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ')

    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Permissions-Policy',
            value: [
              'accelerometer=()',
              'autoplay=()',
              'camera=()',
              'display-capture=()',
              'encrypted-media=()',
              'fullscreen=(self)',
              'geolocation=()',
              'gyroscope=()',
              'magnetometer=()',
              'microphone=()',
              'midi=()',
              'payment=()',
              'picture-in-picture=()',
              'publickey-credentials-get=()',
              'screen-wake-lock=()',
              'usb=()',
              'web-share=()',
              'xr-spatial-tracking=()',
            ].join(', '),
          },
          {
            // Cross-Origin-Opener-Policy : isole le browsing context —
            // durcit le process model contre Spectre-like attacks. Compat
            // avec Stack Auth OAuth popup ("same-origin-allow-popups"
            // plutôt que "same-origin" qui casserait les popups).
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
          {
            key: 'Cross-Origin-Resource-Policy',
            value: 'same-origin',
          },
          {
            key: 'Content-Security-Policy-Report-Only',
            value: cspValue,
          },
        ],
      },
    ]
  },
}

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "wyzlee",

  project: "seo-geo",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: "/monitoring",

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
});
