import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: 'https://cb552981bdf19f543cc104751833e2fc@o4510861777698816.ingest.de.sentry.io/4511240167489616',
  environment: process.env.NODE_ENV ?? 'production',
  tracesSampleRate: 0.05,
  enableLogs: true,
  sendDefaultPii: false,
})
