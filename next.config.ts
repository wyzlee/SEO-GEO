import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['jose'],
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    remotePatterns: [],
  },
  async headers() {
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
            // Désactive toutes les surfaces sensibles : l'app n'en utilise
            // aucune. Ajouts 2.2 : payment, usb, midi, accelerometer,
            // gyroscope, magnetometer, fullscreen, picture-in-picture,
            // publickey-credentials-get (WebAuthn : on le relaxera quand
            // on ajoutera le MFA en V2).
            value: [
              'accelerometer=()',
              'ambient-light-sensor=()',
              'autoplay=()',
              'battery=()',
              'camera=()',
              'display-capture=()',
              'document-domain=()',
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
              'sync-xhr=()',
              'usb=()',
              'web-share=()',
              'xr-spatial-tracking=()',
            ].join(', '),
          },
          {
            // Désactive l'opt-in implicite à la FLoC / Topics API de Google :
            // aucune télémétrie publicitaire ne doit transiter par cette app.
            key: 'Permissions-Policy-Report-Only',
            value: 'interest-cohort=()',
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
        ],
      },
    ]
  },
}

export default nextConfig
