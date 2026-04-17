import { describe, expect, it } from 'vitest'
import { capitalizeProperNouns } from '@/lib/report/proper-nouns'

describe('capitalizeProperNouns', () => {
  it('capitalizes google and ia in a sentence', () => {
    expect(
      capitalizeProperNouns('Visibilité dans google et les moteurs ia en 2026.'),
    ).toBe('Visibilité dans Google et les moteurs IA en 2026.')
  })

  it('fixes common AI engine names', () => {
    expect(
      capitalizeProperNouns('chatgpt, claude, perplexity, gemini, copilot'),
    ).toBe('ChatGPT, Claude, Perplexity, Gemini, Copilot')
  })

  it('normalizes SEO acronyms', () => {
    expect(capitalizeProperNouns('les signaux seo et geo')).toBe(
      'les signaux SEO et GEO',
    )
    expect(capitalizeProperNouns('e-e-a-t matters')).toBe('E-E-A-T matters')
  })

  it('fixes web vitals LCP/INP/CLS', () => {
    expect(capitalizeProperNouns('lcp, inp, cls')).toBe('LCP, INP, CLS')
  })

  it('fixes Wikipedia and Wikidata', () => {
    expect(
      capitalizeProperNouns('Sources : wikipedia et wikidata.'),
    ).toBe('Sources : Wikipedia et Wikidata.')
  })

  it('preserves backticks / inline code untouched', () => {
    expect(
      capitalizeProperNouns('utilise `google` pour chercher, puis google ensuite'),
    ).toBe('utilise `google` pour chercher, puis Google ensuite')
  })

  it('preserves URLs untouched (google.com stays lowercase)', () => {
    expect(
      capitalizeProperNouns('Voir https://www.google.com pour plus — google dit ceci'),
    ).toBe('Voir https://www.google.com pour plus — Google dit ceci')
  })

  it('does not touch words that accidentally contain ia', () => {
    // "via" contient "ia" mais pas comme mot isolé
    expect(capitalizeProperNouns('via le site')).toBe('via le site')
  })

  it('handles empty string and null-ish input gracefully', () => {
    expect(capitalizeProperNouns('')).toBe('')
  })

  it('applies to multi-line text', () => {
    const input = 'Ligne 1 avec google.\n\nLigne 2 avec ia.'
    expect(capitalizeProperNouns(input)).toBe(
      'Ligne 1 avec Google.\n\nLigne 2 avec IA.',
    )
  })
})
