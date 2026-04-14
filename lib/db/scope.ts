import { and, eq, desc, SQL } from 'drizzle-orm'
import { db } from './index'
import { audits, findings, auditPhases, reports } from './schema'

export async function getAuditsForOrg(
  orgId: string,
  opts?: { status?: string; limit?: number },
) {
  const conditions: SQL[] = [eq(audits.organizationId, orgId)]
  if (opts?.status) conditions.push(eq(audits.status, opts.status))

  return db
    .select()
    .from(audits)
    .where(and(...conditions))
    .orderBy(desc(audits.createdAt))
    .limit(opts?.limit ?? 50)
}

export async function getAuditForOrg(auditId: string, orgId: string) {
  const rows = await db
    .select()
    .from(audits)
    .where(and(eq(audits.id, auditId), eq(audits.organizationId, orgId)))
    .limit(1)
  return rows[0] ?? null
}

export async function getFindingsForAudit(auditId: string, orgId: string) {
  const audit = await getAuditForOrg(auditId, orgId)
  if (!audit) return []
  return db
    .select()
    .from(findings)
    .where(eq(findings.auditId, auditId))
    .orderBy(desc(findings.pointsLost))
}

export async function getPhasesForAudit(auditId: string, orgId: string) {
  const audit = await getAuditForOrg(auditId, orgId)
  if (!audit) return []
  return db
    .select()
    .from(auditPhases)
    .where(eq(auditPhases.auditId, auditId))
    .orderBy(auditPhases.phaseOrder)
}

export async function getReportsForAudit(auditId: string, orgId: string) {
  const audit = await getAuditForOrg(auditId, orgId)
  if (!audit) return []
  return db
    .select()
    .from(reports)
    .where(eq(reports.auditId, auditId))
    .orderBy(desc(reports.generatedAt))
}
