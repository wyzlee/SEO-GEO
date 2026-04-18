/**
 * Shallow clone a public GitHub repo into a temp dir. Reuses the same
 * safety guards as zip upload (size check, ignore list). No credentials
 * stored : V1 supports public repos only.
 */
import path from 'node:path'
import { mkdir, rm, stat, readdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import crypto from 'node:crypto'
import simpleGit from 'simple-git'
import { UploadError, MAX_EXTRACTED_BYTES } from '../upload/extract'

export interface CloneResult {
  rootPath: string
  ref: string
  repoUrl: string
}

const IGNORED_DIRS_SIZE = new Set([
  '.git',
  'node_modules',
  '.next',
  '.turbo',
  '.nuxt',
  'dist',
  'build',
  'out',
  'coverage',
])

async function dirSize(dir: string): Promise<number> {
  let total = 0
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return 0
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (IGNORED_DIRS_SIZE.has(entry.name)) continue
      const full = path.join(dir, entry.name)
      total += await dirSize(full)
    } else if (entry.isFile()) {
      try {
        const s = await stat(path.join(dir, entry.name))
        total += s.size
      } catch {
        // broken symlink / perm issue — skip
      }
    }
    if (total > MAX_EXTRACTED_BYTES) return total
  }
  return total
}

export async function cloneGithubRepo(spec: string): Promise<CloneResult> {
  let repoUrl: string
  let branch: string | null = null

  const atIndex = spec.indexOf('@')
  const body = atIndex >= 0 ? spec.slice(0, atIndex) : spec
  branch = atIndex >= 0 ? spec.slice(atIndex + 1) : null

  if (branch !== null && branch.startsWith('-')) {
    throw new UploadError('Nom de branche invalide')
  }

  if (/^https?:\/\/github\.com\//i.test(body)) {
    repoUrl = body.replace(/\.git$/, '') + '.git'
  } else if (/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(body)) {
    repoUrl = `https://github.com/${body}.git`
  } else {
    throw new UploadError(
      'Format de dépôt non reconnu (attendu : owner/repo[@branch])',
    )
  }

  const rootId = crypto.randomBytes(10).toString('hex')
  const rootPath = path.join(tmpdir(), 'seo-geo-audits', rootId)
  await mkdir(rootPath, { recursive: true })

  try {
    const git = simpleGit({ baseDir: rootPath })
    const args: string[] = ['--depth=1', '--single-branch']
    if (branch) args.push('--branch', branch)
    await git.clone(repoUrl, rootPath, args)

    const size = await dirSize(rootPath)
    if (size > MAX_EXTRACTED_BYTES) {
      throw new UploadError(
        'Dépôt trop volumineux pour audit (> 500 Mo après clone, hors node_modules)',
      )
    }

    return { rootPath, ref: branch ?? 'default', repoUrl }
  } catch (error) {
    await rm(rootPath, { recursive: true, force: true }).catch(() => undefined)
    if (error instanceof UploadError) throw error
    const message = error instanceof Error ? error.message : 'Clone échoué'
    throw new UploadError(`Clone GitHub impossible : ${message.slice(0, 200)}`)
  }
}
