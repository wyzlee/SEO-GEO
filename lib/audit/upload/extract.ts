/**
 * Zip extraction with security guards for user-submitted code audits.
 *
 * Guards:
 *  - Max zip size: 50 MB (checked by upload endpoint before we land here)
 *  - Max extracted total: 500 MB
 *  - Compression ratio cap: 100:1
 *  - Path traversal: reject `..`, absolute paths, symlinks outside root
 *  - Extension whitelist: skip binaries, keep source files
 *
 * Returns the extraction root. Caller is responsible for cleanup.
 */
import path from 'node:path'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import crypto from 'node:crypto'
import AdmZip from 'adm-zip'

export const MAX_ZIP_BYTES = 50 * 1024 * 1024
export const MAX_EXTRACTED_BYTES = 500 * 1024 * 1024
export const MAX_COMPRESSION_RATIO = 100

const ALLOWED_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.json',
  '.md',
  '.mdx',
  '.html',
  '.htm',
  '.css',
  '.scss',
  '.sass',
  '.less',
  '.vue',
  '.svelte',
  '.astro',
  '.yml',
  '.yaml',
  '.toml',
  '.txt',
  '.xml',
  '.map',
  '.env.example',
])

const IGNORED_DIR_NAMES = new Set([
  'node_modules',
  '.git',
  '.next',
  '.turbo',
  '.nuxt',
  '.svelte-kit',
  '.output',
  'dist',
  'build',
  'out',
  'coverage',
  '__pycache__',
])

export class UploadError extends Error {
  constructor(message: string, public status = 400) {
    super(message)
    this.name = 'UploadError'
  }
}

function isAllowed(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase()
  if (ALLOWED_EXTENSIONS.has(ext)) return true
  const base = path.basename(filePath)
  return (
    base === 'package.json' ||
    base === 'package-lock.json' ||
    base === 'tsconfig.json' ||
    base === 'robots.txt' ||
    base === 'llms.txt' ||
    base === 'llms-full.txt' ||
    base === 'sitemap.xml' ||
    base.startsWith('.env.') ||
    base === '.gitignore' ||
    base === '.npmrc'
  )
}

function isIgnoredPath(relPath: string): boolean {
  const parts = relPath.split(/[/\\]/)
  return parts.some((p) => IGNORED_DIR_NAMES.has(p))
}

export interface ExtractResult {
  rootPath: string
  totalBytes: number
  fileCount: number
  skippedCount: number
}

export async function validateAndExtract(
  buffer: Buffer,
): Promise<ExtractResult> {
  if (buffer.byteLength > MAX_ZIP_BYTES) {
    throw new UploadError(
      `Fichier trop volumineux (${Math.round(buffer.byteLength / 1024 / 1024)} Mo, max ${MAX_ZIP_BYTES / 1024 / 1024} Mo)`,
    )
  }

  let zip: AdmZip
  try {
    zip = new AdmZip(buffer)
  } catch {
    throw new UploadError('Archive zip invalide ou corrompue')
  }

  const entries = zip.getEntries()
  if (entries.length === 0) {
    throw new UploadError('Archive vide')
  }

  const rootId = crypto.randomBytes(10).toString('hex')
  const rootPath = path.join(tmpdir(), 'seo-geo-audits', rootId)
  await mkdir(rootPath, { recursive: true })

  let totalBytes = 0
  let fileCount = 0
  let skippedCount = 0

  try {
    for (const entry of entries) {
      if (entry.isDirectory) continue

      const rawName = entry.entryName
      if (rawName.includes('..') || path.isAbsolute(rawName)) {
        throw new UploadError('Chemin suspect détecté dans l\'archive')
      }
      if (isIgnoredPath(rawName)) {
        skippedCount += 1
        continue
      }
      if (!isAllowed(rawName)) {
        skippedCount += 1
        continue
      }

      const raw = entry.getData()
      const declaredSize = entry.header.size
      const compressedSize = entry.header.compressedSize || 1
      if (declaredSize / compressedSize > MAX_COMPRESSION_RATIO) {
        throw new UploadError('Ratio de compression suspect (zip bomb)')
      }

      totalBytes += raw.byteLength
      if (totalBytes > MAX_EXTRACTED_BYTES) {
        throw new UploadError('Contenu décompressé trop volumineux')
      }

      const safePath = path.join(rootPath, rawName)
      // Ensure the resolved path stays inside rootPath
      const resolved = path.resolve(safePath)
      if (!resolved.startsWith(path.resolve(rootPath) + path.sep)) {
        throw new UploadError('Chemin hors du répertoire autorisé')
      }

      await mkdir(path.dirname(resolved), { recursive: true })
      await writeFile(resolved, raw)
      fileCount += 1
    }
  } catch (error) {
    await rm(rootPath, { recursive: true, force: true }).catch(() => undefined)
    throw error
  }

  return { rootPath, totalBytes, fileCount, skippedCount }
}

export async function cleanupRoot(rootPath: string): Promise<void> {
  await rm(rootPath, { recursive: true, force: true }).catch(() => undefined)
}
