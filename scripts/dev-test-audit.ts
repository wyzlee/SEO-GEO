/**
 * One-off development test : insert an audit row, run processAudit, dump the
 * results. Bypasses the HTTP API / auth layer so we can validate the pipeline
 * end-to-end without a browser session.
 *
 *   DATABASE_URL=... npx tsx scripts/dev-test-audit.ts <url>
 */
import { eq } from 'drizzle-orm'
import { config } from 'dotenv'
import { resolve } from 'node:path'

config({ path: resolve(process.cwd(), '.env.local') })

import { db } from '@/lib/db'
import { audits, auditPhases, findings } from '@/lib/db/schema'
import { processAudit } from '@/lib/audit/process'

const ORG_ID = '93851689-012d-44d6-8175-2f97bd4ee9d3'
const USER_ID = '48ef7a13-369b-47da-805d-76286557ddb8'

async function main() {
  const target = process.argv[2] || 'https://example.com'
  console.log(`[dev-test] inserting audit for ${target}`)

  const [inserted] = await db
    .insert(audits)
    .values({
      organizationId: ORG_ID,
      createdBy: USER_ID,
      inputType: 'url',
      targetUrl: target,
      status: 'queued',
      clientName: 'Dev Test',
    })
    .returning({ id: audits.id })

  console.log(`[dev-test] audit id=${inserted.id} — starting processAudit`)

  const start = Date.now()
  await processAudit(inserted.id)
  console.log(`[dev-test] processAudit finished in ${Date.now() - start}ms`)

  const [finalAudit] = await db
    .select()
    .from(audits)
    .where(eq(audits.id, inserted.id))
    .limit(1)

  const phases = await db
    .select()
    .from(auditPhases)
    .where(eq(auditPhases.auditId, inserted.id))
    .orderBy(auditPhases.phaseOrder)

  const findingRows = await db
    .select()
    .from(findings)
    .where(eq(findings.auditId, inserted.id))

  console.log('\n=== AUDIT ===')
  console.log({
    status: finalAudit.status,
    scoreTotal: finalAudit.scoreTotal,
    scoreBreakdown: finalAudit.scoreBreakdown,
    errorMessage: finalAudit.errorMessage,
    finishedAt: finalAudit.finishedAt,
  })

  console.log('\n=== PHASES ===')
  for (const phase of phases) {
    console.log(
      `  ${phase.phaseOrder.toString().padStart(2)}. ${phase.phaseKey.padEnd(18)} ${phase.score ?? '-'}/${phase.scoreMax}  ${phase.status.padEnd(10)} — ${phase.summary ?? ''}`,
    )
  }

  console.log(`\n=== FINDINGS (${findingRows.length}) ===`)
  for (const finding of findingRows) {
    console.log(
      `  [${finding.severity.toUpperCase().padEnd(8)}] (-${finding.pointsLost}) ${finding.title}`,
    )
    console.log(`             ${finding.recommendation}`)
  }

  console.log('\n[dev-test] done')
  process.exit(0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
