import { z } from 'zod'

// ---------------------------------------------------------------------------
// POST /api/citations — lancer une vérification de citation
// ---------------------------------------------------------------------------

export const citationToolSchema = z.enum(['perplexity', 'openai'])
export type CitationTool = z.infer<typeof citationToolSchema>

export const createCitationSchema = z.object({
  domain: z
    .string()
    .min(1, { message: 'Le domaine est requis' })
    .max(253, { message: 'Domaine trop long (max 253 caractères)' })
    .regex(/^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+$/, {
      message: 'Domaine invalide (ex: exemple.com)',
    }),
  queries: z
    .array(z.string().min(1).max(500))
    .min(1, { message: 'Au minimum 1 requête est requise' })
    .max(5, { message: 'Maximum 5 requêtes par appel' }),
  tools: z
    .array(citationToolSchema)
    .min(1, { message: 'Au minimum 1 outil LLM est requis' })
    .max(2),
})

export type CreateCitationInput = z.infer<typeof createCitationSchema>

// ---------------------------------------------------------------------------
// GET /api/citations — pagination
// ---------------------------------------------------------------------------

export const listCitationsQuerySchema = z.object({
  domain: z.string().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
})

export type ListCitationsQuery = z.infer<typeof listCitationsQuerySchema>
