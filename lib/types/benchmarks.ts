import { z } from 'zod'

const benchmarkUrlItemSchema = z.object({
  url: z
    .string()
    .url({ message: 'URL invalide' })
    .max(2048, { message: 'URL trop longue (max 2048 caractères)' }),
  label: z
    .string()
    .min(1, { message: 'Le label est requis' })
    .max(100, { message: 'Label trop long (max 100 caractères)' }),
  isReference: z.boolean(),
})

export const createBenchmarkSchema = z
  .object({
    name: z
      .string()
      .min(1, { message: 'Le nom du benchmark est requis' })
      .max(200, { message: 'Nom trop long (max 200 caractères)' }),
    urls: z
      .array(benchmarkUrlItemSchema)
      .min(2, { message: 'Au minimum 2 URLs sont requises' })
      .max(5, { message: 'Maximum 5 URLs par benchmark' }),
    mode: z.enum(['flash', 'full']).optional().default('flash'),
  })
  .refine(
    (data) => data.urls.filter((u) => u.isReference).length === 1,
    { message: 'Exactement 1 URL doit être marquée comme référence (isReference: true)' },
  )

export type CreateBenchmarkInput = z.infer<typeof createBenchmarkSchema>

export const listBenchmarksQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
})

export type ListBenchmarksQuery = z.infer<typeof listBenchmarksQuerySchema>
