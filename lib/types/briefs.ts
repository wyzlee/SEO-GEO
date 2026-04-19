import { z } from 'zod'

// ---------------------------------------------------------------------------
// Validation du JSON retourné par Claude pour un content brief
// ---------------------------------------------------------------------------

export const contentBriefClaudeResponseSchema = z.object({
  title: z.string().min(1).max(500),
  targetKeyword: z.string().min(1).max(200),
  searchIntent: z.enum(['informational', 'commercial', 'navigational']),
  contentType: z.enum(['pillar', 'cluster', 'update']),
  wordCountTarget: z.number().int().min(300).max(10000),
  outline: z.object({
    h2: z.array(z.string()).min(1).max(20),
    h3_per_h2: z.array(z.array(z.string())).max(20),
  }),
  eeatAngle: z.string().max(1000).optional(),
  semanticKeywords: z.array(z.string()).max(50),
})

export type ContentBriefClaudeResponse = z.infer<typeof contentBriefClaudeResponseSchema>

// ---------------------------------------------------------------------------
// Input interne generateContentBriefs
// ---------------------------------------------------------------------------

export const generateBriefsFindingSchema = z.object({
  phaseKey: z.string(),
  title: z.string(),
  description: z.string(),
  recommendation: z.string(),
  pointsLost: z.number().optional().default(0),
})

export type GenerateBriefsFinding = z.infer<typeof generateBriefsFindingSchema>
