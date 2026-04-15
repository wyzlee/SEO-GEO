/**
 * Read the key files from an extracted project to build a CodeSnapshot —
 * the code-mode equivalent of a CrawlSnapshot. Keeps the list short so we
 * can reason statically without walking the whole tree repeatedly.
 */
import path from 'node:path'
import { readFile, readdir, stat } from 'node:fs/promises'
import type { StackInfo } from '../types'
import { detectStack } from './stack-detect'

export interface CodeSnapshot {
  type: 'code'
  rootPath: string
  stack: StackInfo
  packageJson: string | null
  layoutSource: string | null // app/layout.tsx OR app/layout.jsx OR pages/_document.tsx
  rootHtml: string | null // public/index.html OR index.html at root (for static)
  robotsTxt: string | null // public/robots.txt OR app/robots.ts source
  sitemapXml: string | null // public/sitemap.xml OR app/sitemap.ts source
  llmsTxt: string | null // public/llms.txt OR similar
  structuredDataSources: string[] // JSON-LD snippets found in code
  filesIndex: Set<string> // relative paths (lowercased, forward slashes)
}

async function safeReadFile(filePath: string): Promise<string | null> {
  try {
    const s = await stat(filePath)
    if (!s.isFile()) return null
    const content = await readFile(filePath, 'utf-8')
    return content
  } catch {
    return null
  }
}

async function walk(
  dir: string,
  baseDir: string,
  out: Set<string>,
  depth = 0,
  maxEntries = 5000,
): Promise<void> {
  if (out.size >= maxEntries) return
  if (depth > 8) return
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return
  }
  for (const entry of entries) {
    if (out.size >= maxEntries) return
    const full = path.join(dir, entry.name)
    const rel = path.relative(baseDir, full).split(path.sep).join('/').toLowerCase()
    if (entry.isDirectory()) {
      await walk(full, baseDir, out, depth + 1, maxEntries)
    } else {
      out.add(rel)
    }
  }
}

async function findFirstMatch(
  rootPath: string,
  candidates: string[],
): Promise<string | null> {
  for (const rel of candidates) {
    const content = await safeReadFile(path.join(rootPath, rel))
    if (content !== null) return content
  }
  return null
}

function extractJsonLdBlocks(source: string): string[] {
  const out: string[] = []
  // HTML-like : <script type="application/ld+json">...</script>
  const htmlRegex =
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let match: RegExpExecArray | null
  while ((match = htmlRegex.exec(source)) !== null) {
    out.push(match[1].trim())
  }
  // Next <Script type="application/ld+json">{JSON.stringify(...)}</Script>
  // Approximate : capture between the opening JSON.stringify( and the matching )
  const jsxStringify =
    /JSON\.stringify\(\s*(\{[\s\S]*?\})\s*\)/g
  while ((match = jsxStringify.exec(source)) !== null) {
    const candidate = match[1]
    // Only keep objects that look like schema.org payloads
    if (/['"]@context['"]\s*:\s*['"]https?:\/\/schema\.org/i.test(candidate)) {
      out.push(candidate)
    }
  }
  return out
}

export async function readCodeSnapshot(
  rootPath: string,
): Promise<CodeSnapshot> {
  const filesIndex = new Set<string>()
  await walk(rootPath, rootPath, filesIndex)

  const packageJson = await safeReadFile(path.join(rootPath, 'package.json'))
  const stack = detectStack({
    packageJsonContent: packageJson,
    existingFiles: filesIndex,
  })

  const layoutSource = await findFirstMatch(rootPath, [
    'app/layout.tsx',
    'app/layout.jsx',
    'app/layout.js',
    'src/app/layout.tsx',
    'src/app/layout.jsx',
    'pages/_document.tsx',
    'pages/_document.jsx',
    'pages/_document.js',
  ])

  const rootHtml = await findFirstMatch(rootPath, [
    'index.html',
    'public/index.html',
    'dist/index.html',
    'build/index.html',
  ])

  const robotsTxt = await findFirstMatch(rootPath, [
    'public/robots.txt',
    'robots.txt',
    'app/robots.ts',
    'app/robots.tsx',
    'app/robots.js',
    'src/app/robots.ts',
  ])

  const sitemapXml = await findFirstMatch(rootPath, [
    'public/sitemap.xml',
    'sitemap.xml',
    'app/sitemap.ts',
    'app/sitemap.tsx',
    'app/sitemap.js',
    'src/app/sitemap.ts',
  ])

  const llmsTxt = await findFirstMatch(rootPath, [
    'public/llms.txt',
    'llms.txt',
    'app/llms.txt',
  ])

  // Collect structured data candidates from layout + a couple of common pages.
  const sourcesToScan = [
    layoutSource,
    await findFirstMatch(rootPath, ['app/page.tsx', 'app/page.jsx', 'app/page.js', 'src/app/page.tsx', 'pages/index.tsx', 'pages/index.jsx', 'pages/index.js']),
    rootHtml,
  ].filter((s): s is string => !!s)

  const structuredDataSources: string[] = []
  for (const src of sourcesToScan) {
    structuredDataSources.push(...extractJsonLdBlocks(src))
  }

  return {
    type: 'code',
    rootPath,
    stack,
    packageJson,
    layoutSource,
    rootHtml,
    robotsTxt,
    sitemapXml,
    llmsTxt,
    structuredDataSources,
    filesIndex,
  }
}
