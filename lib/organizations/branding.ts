/**
 * Branding white-label d'une organisation. Stocké dans la colonne
 * `organizations.branding` (JSONB nullable). Utilisé côté rapport pour
 * personnaliser la cover et les couleurs.
 *
 * Validation Zod au frontière (routes API). Le rendu côté rapport applique
 * en plus un `safeColor` / `safeLogoUrl` défensif pour refuser toute valeur
 * qui tomberait en base via un autre chemin.
 */
import { z } from 'zod'
import type { ReportBranding } from '@/lib/report/render'

export const brandingInputSchema = z
  .object({
    companyName: z
      .string()
      .trim()
      .max(80)
      .optional()
      .nullable(),
    logoUrl: z
      .string()
      .trim()
      .url({ message: 'URL invalide' })
      .max(500)
      .refine((v) => /^https?:\/\//i.test(v), {
        message: 'URL doit commencer par http:// ou https://',
      })
      .optional()
      .nullable(),
    primaryColor: z
      .string()
      .trim()
      .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/u, {
        message: 'Couleur hex invalide (ex: #4F46E5)',
      })
      .optional()
      .nullable(),
    accentColor: z
      .string()
      .trim()
      .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/u, {
        message: 'Couleur hex invalide (ex: #7C3AED)',
      })
      .optional()
      .nullable(),
  })
  .strict()

export type BrandingInput = z.infer<typeof brandingInputSchema>

/**
 * Shape de ce qui peut exister dans `organizations.branding` JSONB. On
 * tolère les valeurs partielles / historiques (legacy) et on filtre au
 * chargement.
 */
export interface StoredBranding {
  companyName?: string | null
  logoUrl?: string | null
  primaryColor?: string | null
  accentColor?: string | null
}

/**
 * Cast défensif du record JSONB brut vers `ReportBranding`. Retourne `null`
 * si rien n'est exploitable pour éviter de passer un objet vide au renderer.
 */
export function brandingFromRecord(
  raw: StoredBranding | null | undefined,
): ReportBranding | null {
  if (!raw || typeof raw !== 'object') return null
  const { companyName, logoUrl, primaryColor, accentColor } = raw
  if (!companyName && !logoUrl && !primaryColor && !accentColor) return null
  return {
    companyName: companyName ?? null,
    logoUrl: logoUrl ?? null,
    primaryColor: primaryColor ?? null,
    accentColor: accentColor ?? null,
  }
}
