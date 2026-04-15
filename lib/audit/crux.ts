/**
 * Chrome UX Report (CrUX) API integration — real Core Web Vitals from field
 * data. Only fetches if GOOGLE_CRUX_API_KEY is set ; silent fallback otherwise
 * so audits keep working in dev without keys.
 *
 * API docs : https://developer.chrome.com/docs/crux/api
 */

export interface CruxMetrics {
  lcpP75Ms: number | null
  inpP75Ms: number | null
  clsP75: number | null
  formFactor: 'PHONE' | 'DESKTOP' | 'TABLET' | 'ALL_FORM_FACTORS'
  collectionPeriod: {
    firstDate: string
    lastDate: string
  } | null
}

interface CruxResponse {
  record?: {
    key: { url?: string; origin?: string; formFactor?: string }
    metrics?: Record<string, { percentiles?: { p75?: number | string } }>
    collectionPeriod?: {
      firstDate?: { year: number; month: number; day: number }
      lastDate?: { year: number; month: number; day: number }
    }
  }
}

function formatDate(d?: { year: number; month: number; day: number }) {
  if (!d) return null
  return `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`
}

export async function fetchCruxMetrics(
  url: string,
): Promise<CruxMetrics | null> {
  const apiKey = process.env.GOOGLE_CRUX_API_KEY
  if (!apiKey) return null

  try {
    const res = await fetch(
      `https://chromeuxreport.googleapis.com/v1/records:queryRecord?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          formFactor: 'PHONE',
          metrics: ['largest_contentful_paint', 'interaction_to_next_paint', 'cumulative_layout_shift'],
        }),
        signal: AbortSignal.timeout(8_000),
      },
    )
    if (!res.ok) {
      // 404 = no CrUX data for this URL (normal for low-traffic sites)
      return null
    }
    const body = (await res.json()) as CruxResponse
    const metrics = body.record?.metrics ?? {}

    const lcpRaw = metrics['largest_contentful_paint']?.percentiles?.p75
    const inpRaw = metrics['interaction_to_next_paint']?.percentiles?.p75
    const clsRaw = metrics['cumulative_layout_shift']?.percentiles?.p75

    const lcpP75Ms = typeof lcpRaw === 'number' ? lcpRaw : lcpRaw ? parseFloat(String(lcpRaw)) : null
    const inpP75Ms = typeof inpRaw === 'number' ? inpRaw : inpRaw ? parseFloat(String(inpRaw)) : null
    const clsP75 = typeof clsRaw === 'number' ? clsRaw : clsRaw ? parseFloat(String(clsRaw)) : null

    return {
      lcpP75Ms,
      inpP75Ms,
      clsP75,
      formFactor: 'PHONE',
      collectionPeriod: body.record?.collectionPeriod
        ? {
            firstDate: formatDate(body.record.collectionPeriod.firstDate) ?? '',
            lastDate: formatDate(body.record.collectionPeriod.lastDate) ?? '',
          }
        : null,
    }
  } catch {
    return null
  }
}
