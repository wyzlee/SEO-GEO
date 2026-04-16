// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  __resetSink,
  __setSink,
  createLogger,
  logger,
} from '@/lib/observability/logger'

interface Captured {
  line: string
  level: string
  parsed: Record<string, unknown>
}

const captured: Captured[] = []
const originalLevel = process.env.LOG_LEVEL

beforeEach(() => {
  captured.length = 0
  __setSink((line, level) => {
    captured.push({ line, level, parsed: JSON.parse(line) })
  })
  process.env.LOG_LEVEL = 'debug'
})

afterEach(() => {
  __resetSink()
  if (originalLevel === undefined) delete process.env.LOG_LEVEL
  else process.env.LOG_LEVEL = originalLevel
})

describe('logger', () => {
  it('émet 1 ligne JSON par appel avec ts/level/msg', () => {
    logger.info('audit.claimed', { audit_id: 'a1' })
    expect(captured).toHaveLength(1)
    const log = captured[0].parsed
    expect(log.level).toBe('info')
    expect(log.msg).toBe('audit.claimed')
    expect(log.audit_id).toBe('a1')
    expect(typeof log.ts).toBe('string')
    expect(new Date(log.ts as string).toString()).not.toBe('Invalid Date')
  })

  it('route info/debug vers stdout, warn/error vers stderr', () => {
    logger.debug('d')
    logger.info('i')
    logger.warn('w')
    logger.error('e')
    const levels = captured.map((c) => c.level)
    expect(levels).toEqual(['debug', 'info', 'warn', 'error'])
  })

  it('sérialise les Error en { name, message, stack }', () => {
    const err = new Error('boom')
    logger.error('audit.timeout', { audit_id: 'a1', error: err })
    const log = captured[0].parsed
    expect(log.error).toMatchObject({
      name: 'Error',
      message: 'boom',
    })
    expect((log.error as Record<string, unknown>).stack).toContain('Error: boom')
  })

  it('with() fige un contexte propagé sur tous les appels', () => {
    const child = logger.with({ audit_id: 'a1', org_id: 'o1' })
    child.info('audit.phase.start', { phase: 'eeat' })
    child.warn('audit.phase.slow', { phase: 'eeat', ms: 5000 })
    expect(captured[0].parsed).toMatchObject({
      audit_id: 'a1',
      org_id: 'o1',
      phase: 'eeat',
      msg: 'audit.phase.start',
    })
    expect(captured[1].parsed).toMatchObject({
      audit_id: 'a1',
      org_id: 'o1',
      phase: 'eeat',
      msg: 'audit.phase.slow',
      ms: 5000,
    })
  })

  it('with() est immuable : le parent ne récupère pas le contexte enfant', () => {
    const child = logger.with({ audit_id: 'a1' })
    child.info('child')
    logger.info('root')
    expect(captured[0].parsed.audit_id).toBe('a1')
    expect(captured[1].parsed.audit_id).toBeUndefined()
  })

  it('respecte LOG_LEVEL = warn (filtre debug + info)', () => {
    process.env.LOG_LEVEL = 'warn'
    logger.debug('d')
    logger.info('i')
    logger.warn('w')
    logger.error('e')
    expect(captured.map((c) => c.level)).toEqual(['warn', 'error'])
  })

  it('LOG_LEVEL = silent → aucun output', () => {
    process.env.LOG_LEVEL = 'silent'
    logger.error('e')
    expect(captured).toHaveLength(0)
  })

  it('LOG_LEVEL invalide → fallback info', () => {
    process.env.LOG_LEVEL = 'lol'
    logger.debug('d')
    logger.info('i')
    expect(captured.map((c) => c.parsed.msg)).toEqual(['i'])
  })

  it('createLogger() crée une instance autonome avec contexte', () => {
    const log = createLogger({ component: 'worker', pid: 1234 })
    log.info('worker.start')
    expect(captured[0].parsed).toMatchObject({
      component: 'worker',
      pid: 1234,
      msg: 'worker.start',
    })
  })

  it('Error nichée dans un sous-objet n\'est PAS sérialisée (limite assumée)', () => {
    // On ne fait que normaliser au top-level — assumé pour rester simple.
    // Si un Error doit être loggué, le mettre directement dans ctx.
    const err = new Error('inner')
    logger.error('test', { wrapper: { error: err } })
    const log = captured[0].parsed
    // L'objet wrapper passe tel quel ; JSON.stringify(Error) → {} natif.
    expect(log.wrapper).toBeDefined()
  })
})
