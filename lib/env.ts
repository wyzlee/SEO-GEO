/**
 * Validation des variables d'environnement au boot.
 *
 * - PROD : variables manquantes = throw fatal (fail-fast pour éviter un
 *   déploiement cassé silencieux, ex. DATABASE_URL absent = crash au
 *   premier INSERT).
 * - DEV/TEST : log.warn seulement, pour ne pas bloquer les scripts locaux.
 *
 * Les variables sont regroupées par feature pour que chaque feature
 * déclare ses besoins, plutôt qu'une liste monolithique.
 */
import { z } from 'zod'
import { logger } from '@/lib/observability/logger'

/** Variables obligatoires — sans elles, l'app ne peut pas fonctionner. */
const requiredSchema = z.object({
  DATABASE_URL: z.string().url('DATABASE_URL doit être une URL valide'),
  NEXT_PUBLIC_STACK_PROJECT_ID: z.string().uuid('Project ID Stack Auth invalide (UUID attendu)'),
  NEXT_PUBLIC_STACK_PUBLISHABLE_KEY: z.string().min(1),
  STACK_SECRET_SERVER_KEY: z.string().min(1),
  STACK_WEBHOOK_SECRET: z.string().min(16, 'Stack webhook secret trop court (min 16 chars)'),
  CRON_SECRET: z.string().min(32, 'CRON_SECRET trop court (min 32 chars — openssl rand -hex 32)'),
})

/** Variables optionnelles mais recommandées en prod. */
const recommendedSchema = z.object({
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(16).optional(),
  STRIPE_SECRET_KEY: z.string().startsWith('sk_').optional(),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_').optional(),
  RESEND_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
})

export interface EnvValidationResult {
  ok: boolean
  missing: string[]
  warnings: string[]
}

/**
 * Valide l'environnement. N'exit jamais — remonte les erreurs pour que
 * l'appelant décide (throw en prod, warn en dev).
 */
export function validateEnv(): EnvValidationResult {
  const missing: string[] = []
  const warnings: string[] = []

  const req = requiredSchema.safeParse(process.env)
  if (!req.success) {
    for (const issue of req.error.issues) {
      missing.push(`${issue.path.join('.')}: ${issue.message}`)
    }
  }

  const rec = recommendedSchema.safeParse(process.env)
  if (!rec.success) {
    for (const issue of rec.error.issues) {
      warnings.push(`${issue.path.join('.')}: ${issue.message}`)
    }
  }

  // Checks ciblés supplémentaires pour prod.
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.UPSTASH_REDIS_REST_URL) {
      warnings.push(
        'UPSTASH_REDIS_REST_URL absent : rate limiter tombera en fail-closed (voir lib/security/rate-limit.ts).',
      )
    }
    if (!process.env.STRIPE_SECRET_KEY) {
      warnings.push(
        'STRIPE_SECRET_KEY absent : toute route Stripe (checkout/portal/webhook) crashera si appelée.',
      )
    }
  }

  return { ok: missing.length === 0, missing, warnings }
}

/**
 * À appeler au démarrage (layout root en prod, worker bootstrap).
 *
 * - PROD : throw si une variable obligatoire manque (fail-fast).
 * - DEV/TEST : log.warn et continue.
 */
export function assertEnvOrThrow(): void {
  const result = validateEnv()

  if (result.warnings.length > 0) {
    logger.warn('env.validation.warnings', {
      count: result.warnings.length,
      warnings: result.warnings,
    })
  }

  if (!result.ok) {
    if (process.env.NODE_ENV === 'production') {
      logger.error('env.validation.failed', {
        missing: result.missing,
        message: 'Variables obligatoires manquantes en production.',
      })
      throw new Error(
        `Configuration environment invalide : ${result.missing.join(' ; ')}`,
      )
    }
    logger.warn('env.validation.missing', {
      missing: result.missing,
      env: process.env.NODE_ENV ?? 'unknown',
      note: 'Variables manquantes tolérées hors production.',
    })
  }
}
