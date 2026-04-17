import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import { Fira_Code } from 'next/font/google'
import { ThemeProvider } from 'next-themes'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/lib/auth/context'
import { QueryProvider } from '@/lib/query/provider'
import './globals.css'

const cabinetGrotesk = localFont({
  src: [
    {
      path: '../public/fonts/cabinet-grotesk-400.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../public/fonts/cabinet-grotesk-500.woff2',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../public/fonts/cabinet-grotesk-700.woff2',
      weight: '700',
      style: 'normal',
    },
    {
      path: '../public/fonts/cabinet-grotesk-800.woff2',
      weight: '800',
      style: 'normal',
    },
    {
      path: '../public/fonts/cabinet-grotesk-900.woff2',
      weight: '900',
      style: 'normal',
    },
  ],
  variable: '--font-display',
  display: 'swap',
})

const firaCode = Fira_Code({
  variable: '--font-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f4f6f9' },
    { media: '(prefers-color-scheme: dark)', color: '#080c10' },
  ],
}

const appUrl =
  process.env.NEXT_PUBLIC_APP_URL || 'https://seo-geo-orcin.vercel.app'

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: 'SEO-GEO — Audit SEO & GEO nouvelle génération',
    template: '%s | SEO-GEO',
  },
  description:
    'Plateforme d\'audit SEO et GEO (Generative Engine Optimization) pour 2026. Analysez la visibilité de votre site dans Google et dans les moteurs IA.',
  robots: {
    index: false,
    follow: false,
  },
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body
        className={`${firaCode.variable} ${cabinetGrotesk.variable} antialiased`}
        suppressHydrationWarning
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4"
          style={{ background: 'var(--color-accent)', color: '#fff' }}
        >
          Aller au contenu
        </a>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <QueryProvider>
              {children}
              <Toaster position="top-right" richColors closeButton />
            </QueryProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
