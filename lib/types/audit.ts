import { z } from 'zod'

export const createAuditSchema = z
  .object({
    inputType: z.enum(['url', 'zip', 'github']),
    targetUrl: z.string().url().optional(),
    uploadId: z.string().uuid().optional(),
    githubRepo: z
      .string()
      .regex(/^[\w-]+\/[\w.-]+(@[\w.-]+)?$/)
      .optional(),
    mode: z.enum(['full', 'quick']).default('full'),
    clientName: z.string().max(200).optional(),
    consultantName: z.string().max(200).optional(),
    organizationId: z.string().uuid(),
  })
  .refine(
    (data) =>
      (data.inputType === 'url' && !!data.targetUrl) ||
      (data.inputType === 'zip' && !!data.uploadId) ||
      (data.inputType === 'github' && !!data.githubRepo),
    { message: 'Input payload does not match input_type' },
  )

export type CreateAuditInput = z.infer<typeof createAuditSchema>

export const auditStatusSchema = z.enum([
  'queued',
  'running',
  'completed',
  'failed',
])
export type AuditStatus = z.infer<typeof auditStatusSchema>

export const severitySchema = z.enum([
  'critical',
  'high',
  'medium',
  'low',
  'info',
])
export type Severity = z.infer<typeof severitySchema>

export const effortSchema = z.enum(['quick', 'medium', 'heavy'])
export type Effort = z.infer<typeof effortSchema>
