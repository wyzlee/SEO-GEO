/**
 * Detect the framework of an extracted project root.
 * Pure function : takes { packageJson, files } and returns StackInfo.
 */
import type { StackInfo, StackFramework } from '../types'

export interface StackDetectInput {
  packageJsonContent: string | null
  existingFiles: Set<string> // relative paths, lowercase
}

interface PackageJson {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  scripts?: Record<string, string>
}

function deps(pkg: PackageJson | null): Record<string, string> {
  if (!pkg) return {}
  return { ...pkg.dependencies, ...pkg.devDependencies }
}

export function detectStack(input: StackDetectInput): StackInfo {
  let pkg: PackageJson | null = null
  if (input.packageJsonContent) {
    try {
      pkg = JSON.parse(input.packageJsonContent) as PackageJson
    } catch {
      pkg = null
    }
  }

  const allDeps = deps(pkg)
  const files = input.existingFiles

  const hasDep = (name: string) => Object.keys(allDeps).some((d) => d === name)

  // Next.js
  if (hasDep('next')) {
    // App Router if /app exists with layout, else pages router
    if (
      [...files].some((f) => f.startsWith('app/layout.') || f === 'app/page.tsx' || f === 'app/page.jsx')
    ) {
      return { framework: 'next-app', hasSSR: true }
    }
    if ([...files].some((f) => f.startsWith('pages/'))) {
      return { framework: 'next-pages', hasSSR: true }
    }
    return { framework: 'next-app', hasSSR: true }
  }

  if (hasDep('nuxt') || hasDep('nuxt3')) {
    return { framework: 'nuxt', hasSSR: true }
  }
  if (hasDep('@remix-run/react') || hasDep('@remix-run/node')) {
    return { framework: 'remix', hasSSR: true }
  }
  if (hasDep('astro')) {
    return { framework: 'astro', hasSSR: true }
  }

  if (hasDep('vite') && hasDep('react')) {
    const isHashRouter = [...files].some(
      (f) =>
        f.includes('hashrouter') ||
        f.endsWith('router.tsx') ||
        f.endsWith('router.ts'),
    )
    return {
      framework: 'react-spa',
      hasSSR: false,
      routerType: isHashRouter ? 'hash' : 'history',
    }
  }

  if (hasDep('react')) {
    return { framework: 'react-spa', hasSSR: false, routerType: 'history' }
  }

  if (
    [...files].some((f) => f === 'index.html') &&
    !hasDep('react') &&
    !hasDep('vue') &&
    !hasDep('svelte')
  ) {
    return { framework: 'static', hasSSR: false }
  }

  return { framework: 'other', hasSSR: false }
}

export function stackLabel(stack: StackInfo): string {
  const map: Record<StackFramework, string> = {
    'next-app': 'Next.js (App Router)',
    'next-pages': 'Next.js (Pages Router)',
    nuxt: 'Nuxt',
    remix: 'Remix',
    astro: 'Astro',
    'react-spa': 'React SPA',
    static: 'HTML statique',
    other: 'Framework inconnu',
  }
  return map[stack.framework]
}
