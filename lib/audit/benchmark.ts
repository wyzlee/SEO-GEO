/**
 * Benchmark — comparaison multi-URL au sein d'une organisation.
 *
 * Ce module gère :
 *  - La création d'un benchmark (insert + URLs associées)
 *  - La lecture des résultats comparatifs (tableau de scores par phase)
 *  - Les helpers de transition d'état utilisés par le worker
 */
import { and, eq, inArray, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  benchmarks,
  benchmarkUrls,
  audits,
  auditPhases,
  type Benchmark,
  type BenchmarkUrl,
  type Audit,
} from '@/lib/db/schema'

// ---------------------------------------------------------------------------
// Création
// ---------------------------------------------------------------------------

export interface CreateBenchmarkParams {
  organizationId: string
  createdBy: string
  name: string
  mode: 'flash' | 'full'
  urls: Array<{ url: string; label: string; isReference: boolean }>
}

/**
 * Insère un benchmark (status='queued') et ses N URLs.
 * Le fan-out des audits est délégué au worker pour éviter une réponse HTTP
 * bloquée sur N crawls — la route POST retourne immédiatement le benchmarkId.
 *
 * Quota : le worker créera N audits qui comptent chacun dans le quota de
 * l'org. Choix délibéré : pas de pré-déduction atomique ici pour rester
 * simple en V1. À revoir si le quota per-org doit être strict.
 */
export async function createBenchmark(params: CreateBenchmarkParams): Promise<string> {
  return db.transaction(async (tx) => {
    const [benchmark] = await tx
      .insert(benchmarks)
      .values({
        organizationId: params.organizationId,
        createdBy: params.createdBy,
        name: params.name,
        mode: params.mode,
        status: 'queued',
      })
      .returning({ id: benchmarks.id })

    const benchmarkId = benchmark.id

    await tx.insert(benchmarkUrls).values(
      params.urls.map((u) => ({
        benchmarkId,
        url: u.url,
        label: u.label,
        isReference: u.isReference,
        auditId: null,
      })),
    )

    return benchmarkId
  })
}

// ---------------------------------------------------------------------------
// Lecture résultats
// ---------------------------------------------------------------------------

export interface BenchmarkUrlWithAudit extends BenchmarkUrl {
  audit: Audit | null
  scoreBreakdown: Record<string, number> | null
}

export interface ComparisonRow {
  phaseKey: string
  scores: Record<string, number> // label → score
  maxScore: number
}

export interface BenchmarkResults {
  benchmark: Benchmark
  urls: BenchmarkUrlWithAudit[]
  comparisonTable: ComparisonRow[]
}

/**
 * Lit les résultats d'un benchmark.
 * Vérifie que le benchmark appartient à l'org transmise en paramètre
 * (multi-tenant strict) — retourne null si inconnu ou hors-scope.
 */
export async function getBenchmarkResults(
  benchmarkId: string,
  organizationId: string,
): Promise<BenchmarkResults | null> {
  // Load benchmark — scoped à l'org
  const [benchmark] = await db
    .select()
    .from(benchmarks)
    .where(
      and(
        eq(benchmarks.id, benchmarkId),
        eq(benchmarks.organizationId, organizationId),
      ),
    )
    .limit(1)

  if (!benchmark) return null

  // Load URLs du benchmark
  const urlRows = await db
    .select()
    .from(benchmarkUrls)
    .where(eq(benchmarkUrls.benchmarkId, benchmarkId))

  // Load audits associés (ceux dont auditId est renseigné)
  const auditIds = urlRows
    .map((u) => u.auditId)
    .filter((id): id is string => id !== null)

  const auditRows: Audit[] =
    auditIds.length > 0
      ? await db.select().from(audits).where(inArray(audits.id, auditIds))
      : []

  const auditMap = new Map<string, Audit>(auditRows.map((a) => [a.id, a]))

  // Assembler urls enrichies
  const enrichedUrls: BenchmarkUrlWithAudit[] = urlRows.map((u) => {
    const audit = u.auditId ? (auditMap.get(u.auditId) ?? null) : null
    const scoreBreakdown = (audit?.scoreBreakdown as Record<string, number> | null | undefined) ?? null
    return { ...u, audit, scoreBreakdown }
  })

  // Construire le tableau de comparaison par phase
  // On récupère les auditPhases pour tous les audits complétés
  const comparisonTable: ComparisonRow[] = []

  if (auditIds.length > 0) {
    const phaseRows = await db
      .select()
      .from(auditPhases)
      .where(inArray(auditPhases.auditId, auditIds))

    // Regrouper par phaseKey
    const phaseMap = new Map<string, { scores: Record<string, number>; maxScore: number }>()

    for (const phase of phaseRows) {
      if (phase.score === null) continue

      const urlEntry = urlRows.find((u) => u.auditId === phase.auditId)
      if (!urlEntry) continue

      const label = urlEntry.label
      if (!phaseMap.has(phase.phaseKey)) {
        phaseMap.set(phase.phaseKey, { scores: {}, maxScore: phase.scoreMax })
      }
      phaseMap.get(phase.phaseKey)!.scores[label] = phase.score
    }

    for (const [phaseKey, { scores, maxScore }] of phaseMap.entries()) {
      comparisonTable.push({ phaseKey, scores, maxScore })
    }

    // Trier par phaseKey pour stabilité
    comparisonTable.sort((a, b) => a.phaseKey.localeCompare(b.phaseKey))
  }

  return { benchmark, urls: enrichedUrls, comparisonTable }
}

// ---------------------------------------------------------------------------
// Helpers de transition d'état (utilisés par le worker)
// ---------------------------------------------------------------------------

/**
 * Atomic claim : queued → running. Retourne true si le claim est gagné.
 * Même pattern que markAuditRunning dans persist.ts.
 */
export async function markBenchmarkRunning(benchmarkId: string): Promise<boolean> {
  const result = await db
    .update(benchmarks)
    .set({
      status: 'running',
    })
    .where(
      and(
        eq(benchmarks.id, benchmarkId),
        eq(benchmarks.status, 'queued'),
      ),
    )
    .returning({ id: benchmarks.id })
  return result.length > 0
}

/**
 * Tente de finaliser le benchmark si tous ses audits liés sont terminaux
 * (status = 'completed' | 'failed'). Retourne true si le benchmark a été
 * marqué completed/failed, false si les audits sont encore en cours.
 *
 * Appelé par le worker après chaque cycle de poll pour les benchmarks running.
 */
export async function tryCompleteBenchmark(benchmarkId: string): Promise<boolean> {
  const urlRows = await db
    .select({ auditId: benchmarkUrls.auditId })
    .from(benchmarkUrls)
    .where(eq(benchmarkUrls.benchmarkId, benchmarkId))

  const auditIds = urlRows
    .map((u) => u.auditId)
    .filter((id): id is string => id !== null)

  // Si aucun audit n'est encore lié (fan-out pas encore fait) → pas prêt
  if (auditIds.length === 0 || auditIds.length < urlRows.length) return false

  const auditRows = await db
    .select({ id: audits.id, status: audits.status })
    .from(audits)
    .where(inArray(audits.id, auditIds))

  const allTerminal = auditRows.every(
    (a) => a.status === 'completed' || a.status === 'failed',
  )
  if (!allTerminal) return false

  const anySuccess = auditRows.some((a) => a.status === 'completed')
  const newStatus = anySuccess ? 'completed' : 'failed'

  await db
    .update(benchmarks)
    .set({ status: newStatus, finishedAt: sql`now()` })
    .where(eq(benchmarks.id, benchmarkId))

  return true
}

/**
 * Marque un benchmark comme failed (ex. erreur fatale pendant le fan-out).
 */
export async function failBenchmark(benchmarkId: string, _reason: string): Promise<void> {
  await db
    .update(benchmarks)
    .set({
      status: 'failed',
      finishedAt: sql`now()`,
    })
    .where(eq(benchmarks.id, benchmarkId))
}

/**
 * Crée les audits pour chaque URL d'un benchmark et met à jour les
 * benchmarkUrls.auditId correspondants. Appelé une seule fois par le worker
 * au moment du claim.
 *
 * Le mode ('flash' | 'full') est lu depuis la table benchmarks et propagé
 * à chaque audit créé. Les audits audio rejoignent la queue normale.
 * L'opération est semi-idempotente : les URLs ayant déjà un auditId sont
 * ignorées (cas de relancement après crash partiel).
 *
 * Retourne les auditIds nouvellement créés.
 */
export async function fanOutBenchmarkAudits(
  benchmarkId: string,
  organizationId: string,
  createdBy: string,
): Promise<string[]> {
  // Lire le mode depuis la table benchmarks
  const [benchmarkRow] = await db
    .select({ mode: benchmarks.mode })
    .from(benchmarks)
    .where(eq(benchmarks.id, benchmarkId))
    .limit(1)

  const mode = benchmarkRow?.mode ?? 'flash'

  const urlRows = await db
    .select()
    .from(benchmarkUrls)
    .where(eq(benchmarkUrls.benchmarkId, benchmarkId))

  // Seulement celles sans audit lié (idempotent si relancé)
  const pending = urlRows.filter((u) => u.auditId === null)
  if (pending.length === 0) return []

  const createdAuditIds: string[] = []

  for (const urlRow of pending) {
    // Insert + update dans une unité logique par URL pour limiter la fenêtre
    // de cohérence en cas de crash partiel.
    const [inserted] = await db
      .insert(audits)
      .values({
        organizationId,
        createdBy,
        inputType: 'url',
        targetUrl: urlRow.url,
        mode,
        status: 'queued',
      })
      .returning({ id: audits.id })

    await db
      .update(benchmarkUrls)
      .set({ auditId: inserted.id })
      .where(eq(benchmarkUrls.id, urlRow.id))

    createdAuditIds.push(inserted.id)
  }

  return createdAuditIds
}
