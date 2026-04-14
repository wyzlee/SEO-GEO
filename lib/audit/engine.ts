/**
 * Audit engine orchestrator — Sprint 03.
 *
 * Runs the 11 audit phases sequentially for a single audit, writing findings
 * and audit_phases rows as it goes. See `.claude/docs/audit-engine.md` for the
 * full specification of each phase and the scoring rubric.
 */

export interface AuditContext {
  auditId: string
  organizationId: string
  targetUrl?: string
  uploadPath?: string
}

export async function runAudit(_ctx: AuditContext): Promise<void> {
  throw new Error('runAudit not implemented — Sprint 03')
}
