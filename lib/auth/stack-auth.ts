'use client'

import { StackClientApp } from '@stackframe/react'

let stackAuthInstance: StackClientApp | null = null

export function getStackAuth(): StackClientApp {
  if (!stackAuthInstance) {
    stackAuthInstance = new StackClientApp({
      projectId: process.env.NEXT_PUBLIC_STACK_PROJECT_ID!,
      ...(process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_KEY
        ? { publishableClientKey: process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_KEY }
        : {}),
      tokenStore: 'cookie',
      urls: {
        oauthCallback:
          (typeof window !== 'undefined' ? window.location.origin : '') +
          '/auth/callback',
      },
    })
  }
  return stackAuthInstance
}
