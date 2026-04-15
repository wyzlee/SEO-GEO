import { config } from 'dotenv'
import { resolve } from 'node:path'

config({ path: resolve(process.cwd(), '.env.local') })

import { db } from '@/lib/db'
import { audits, auditPhases, findings } from '@/lib/db/schema'
import { processAudit } from '@/lib/audit/process'
import { eq } from 'drizzle-orm'

const ORG_ID = '93851689-012d-44d6-8175-2f97bd4ee9d3'
const USER_ID = '48ef7a13-369b-47da-805d-76286557ddb8'

async function main() {
  const repo = process.argv[2] || 'vercel/next.js'
  console.log(`[test] cloning + auditing github:${repo}`)
  const [ins] = await db
    .insert(audits)
    .values({
      organizationId: ORG_ID,
      createdBy: USER_ID,
      inputType: 'github',
      githubRepo: repo,
      clientName: 'GitHub Test',
      status: 'queued',
    })
    .returning({ id: audits.id })

  const start = Date.now()
  await processAudit(ins.id)
  console.log(`[test] processAudit in ${Date.now() - start}ms`)

  const [final] = await db.select().from(audits).where(eq(audits.id, ins.id))
  const phs = await db
    .select()
    .from(auditPhases)
    .where(eq(auditPhases.auditId, ins.id))
    .orderBy(auditPhases.phaseOrder)
  const fn = await db.select().from(findings).where(eq(findings.auditId, ins.id))

  console.log('\n=== AUDIT ===')
  console.log({ status: final.status, score: final.scoreTotal, error: final.errorMessage })
  console.log('\n=== PHASES ===')
  for (const p of phs) {
    console.log(
      `  ${p.phaseOrder.toString().padStart(2)}. ${p.phaseKey.padEnd(18)} ${p.score ?? '-'}/${p.scoreMax}  ${p.status.padEnd(10)} — ${p.summary ?? ''}`,
    )
  }
  console.log(`\n=== FINDINGS (${fn.length}) ===`)
  for (const f of fn.slice(0, 10)) {
    console.log(`  [${f.severity.toUpperCase().padEnd(8)}] (-${f.pointsLost}) ${f.title}`)
  }
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
