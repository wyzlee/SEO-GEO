/**
 * Logger structuré JSON 1-ligne pour SEO-GEO.
 *
 * - 1 log = 1 ligne JSON sur stdout/stderr (parsable en prod par n'importe
 *   quelle pipeline d'agrégation).
 * - Pas de PII : ne logger que des id (audit_id, org_id, user_id), des
 *   compteurs, des codes d'erreur. Jamais de body utilisateur, JWT, email
 *   complet, contenu HTML crawlé.
 * - `msg` = nom d'événement court (`audit.claimed`, `audit.timeout`,
 *   `worker.fatal`). Convention : `domain.event`.
 * - `ctx` = champs structurés ; les Error sont sérialisées automatiquement.
 *
 * Usage :
 *   import { logger } from '@/lib/observability/logger'
 *   logger.info('audit.claimed', { audit_id })
 *   const log = logger.with({ audit_id }) // contexte figé
 *   log.error('audit.timeout', { error })
 *
 * Niveau global via env LOG_LEVEL (debug|info|warn|error|silent), défaut info.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent'

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 100,
}

function envLevel(): LogLevel {
  const raw = (process.env.LOG_LEVEL ?? 'info').toLowerCase()
  if (raw in LEVEL_ORDER) return raw as LogLevel
  return 'info'
}

export interface Logger {
  debug(msg: string, ctx?: Record<string, unknown>): void
  info(msg: string, ctx?: Record<string, unknown>): void
  warn(msg: string, ctx?: Record<string, unknown>): void
  error(msg: string, ctx?: Record<string, unknown>): void
  with(ctx: Record<string, unknown>): Logger
}

type Sink = (line: string, level: LogLevel) => void

const defaultSink: Sink = (line, level) => {
  if (level === 'error' || level === 'warn') process.stderr.write(line + '\n')
  else process.stdout.write(line + '\n')
}

let activeSink: Sink = defaultSink

/** Test-only : remplace le sink (collecte mémoire, etc). */
export function __setSink(sink: Sink): void {
  activeSink = sink
}

/** Test-only : restaure le sink stdout/stderr par défaut. */
export function __resetSink(): void {
  activeSink = defaultSink
}

function serializeError(err: Error): Record<string, unknown> {
  return {
    name: err.name,
    message: err.message,
    stack: err.stack,
  }
}

function normalizeCtx(
  ctx: Record<string, unknown> | undefined,
): Record<string, unknown> {
  if (!ctx) return {}
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(ctx)) {
    if (v instanceof Error) out[k] = serializeError(v)
    else out[k] = v
  }
  return out
}

function emit(
  level: LogLevel,
  baseCtx: Record<string, unknown>,
  msg: string,
  ctx?: Record<string, unknown>,
): void {
  if (LEVEL_ORDER[level] < LEVEL_ORDER[envLevel()]) return
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    msg,
    ...baseCtx,
    ...normalizeCtx(ctx),
  })
  activeSink(line, level)
}

function build(baseCtx: Record<string, unknown> = {}): Logger {
  return {
    debug: (msg, ctx) => emit('debug', baseCtx, msg, ctx),
    info: (msg, ctx) => emit('info', baseCtx, msg, ctx),
    warn: (msg, ctx) => emit('warn', baseCtx, msg, ctx),
    error: (msg, ctx) => emit('error', baseCtx, msg, ctx),
    with: (ctx) => build({ ...baseCtx, ...normalizeCtx(ctx) }),
  }
}

export const logger: Logger = build()

/** Crée un logger autonome avec un contexte pré-rempli. */
export function createLogger(baseCtx?: Record<string, unknown>): Logger {
  return build(baseCtx ?? {})
}
