/**
 * Dev-only : pick the most recent completed audit, generate a report, print
 * the share slug so we can verify /r/:slug end-to-end.
 */
import { desc, eq } from 'drizzle-orm'
import crypto from 'node:crypto'
import { config } from 'dotenv'
import { resolve } from 'node:path'

config({ path: resolve(process.cwd(), '.env.local') })

import { db } from '@/lib/db'
import { audits, auditPhases, findings, reports } from '@/lib/db/schema'
import { generateReport } from '@/lib/report/generate'

async function main() {
  const [audit] = await db
    .select()
    .from(audits)
    .where(eq(audits.status, 'completed'))
    .orderBy(desc(audits.createdAt))
    .limit(1)

  if (!audit) {
    console.log('[dev-test-report] no completed audit found')
    process.exit(0)
  }

  console.log(`[dev-test-report] using audit ${audit.id} (${audit.targetUrl})`)

  const [phaseRows, findingRows] = await Promise.all([
    db.select().from(auditPhases).where(eq(auditPhases.auditId, audit.id)).orderBy(auditPhases.phaseOrder),
    db.select().from(findings).where(eq(findings.auditId, audit.id)),
  ])

  const rendered = generateReport({
    audit: {
      id: audit.id,
      targetUrl: audit.targetUrl,
      clientName: audit.clientName,
      consultantName: audit.consultantName,
      scoreTotal: audit.scoreTotal,
      scoreBreakdown: (audit.scoreBreakdown as Record<string, number> | null) ?? null,
      finishedAt: audit.finishedAt,
    },
    phases: phaseRows.map((p) => ({
      phaseKey: p.phaseKey,
      score: p.score,
      scoreMax: p.scoreMax,
      status: p.status,
      summary: p.summary,
    })),
    findings: findingRows.map((f) => ({
      phaseKey: f.phaseKey,
      severity: f.severity as 'critical' | 'high' | 'medium' | 'low' | 'info',
      category: f.category,
      title: f.title,
      description: f.description,
      recommendation: f.recommendation,
      pointsLost: f.pointsLost,
      effort: f.effort as 'quick' | 'medium' | 'heavy' | null,
    })),
  })

  const slug = crypto.randomBytes(18).toString('base64url')
  const [inserted] = await db
    .insert(reports)
    .values({
      auditId: audit.id,
      format: 'web',
      language: 'fr',
      templateVersion: rendered.templateVersion,
      contentMd: rendered.markdown,
      contentHtml: rendered.html,
      shareSlug: slug,
      shareExpiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000),
    })
    .returning({ id: reports.id, shareSlug: reports.shareSlug })

  console.log(`[dev-test-report] generated report ${inserted.id}`)
  console.log(`[dev-test-report] share slug : ${inserted.shareSlug}`)
  console.log(`[dev-test-report] public URL : http://localhost:3000/r/${inserted.shareSlug}`)
  console.log(`[dev-test-report] markdown chars: ${rendered.markdown.length}`)
  console.log(`[dev-test-report] html chars: ${rendered.html.length}`)
  console.log(`\n--- first 800 chars of markdown ---\n${rendered.markdown.slice(0, 800)}`)
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
