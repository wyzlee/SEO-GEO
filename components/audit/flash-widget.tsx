'use client'

import { useEffect, useRef, useState } from 'react'
import type { FlashAuditResult, FlashPhaseScore } from '@/lib/audit/flash'

type State =
  | { phase: 'idle' }
  | { phase: 'loading' }
  | { phase: 'result'; data: FlashAuditResult }
  | { phase: 'error'; message: string }

const SEVERITY_COLOR: Record<string, string> = {
  critical: 'var(--color-red)',
  high: '#f97316',
  medium: 'var(--color-amber)',
  low: 'var(--color-blue)',
  info: 'var(--color-muted)',
}

function scoreColor(score: number, max: number): string {
  const pct = max > 0 ? (score / max) * 100 : 0
  if (pct >= 75) return 'var(--color-green)'
  if (pct >= 50) return 'var(--color-blue)'
  if (pct >= 25) return 'var(--color-amber)'
  return 'var(--color-red)'
}

function PhaseBar({ phase }: { phase: FlashPhaseScore }) {
  const pct = phase.scoreMax > 0 ? Math.round((phase.score / phase.scoreMax) * 100) : 0
  const color = scoreColor(phase.score, phase.scoreMax)
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-xs font-[family-name:var(--font-display)]">
        <span style={{ color: 'var(--color-text)' }}>{phase.label}</span>
        <span style={{ color }} className="font-semibold tabular-nums">
          {phase.score}/{phase.scoreMax}
        </span>
      </div>
      <div
        className="h-1.5 rounded-full overflow-hidden"
        style={{ background: 'var(--color-border)' }}
      >
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  )
}

function AnimatedScore({ target }: { target: number }) {
  const [displayed, setDisplayed] = useState(0)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const start = performance.now()
    const duration = 1000
    function tick(now: number) {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayed(Math.round(eased * target))
      if (progress < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target])

  let color = 'var(--color-red)'
  if (target >= 80) color = 'var(--color-green)'
  else if (target >= 60) color = 'var(--color-blue)'
  else if (target >= 40) color = 'var(--color-amber)'

  return (
    <div className="flex items-baseline gap-1">
      <span
        className="text-5xl font-bold font-[family-name:var(--font-display)] tabular-nums"
        style={{ color }}
      >
        {displayed}
      </span>
      <span
        className="text-xl font-[family-name:var(--font-sans)]"
        style={{ color: 'var(--color-muted)' }}
      >
        /100
      </span>
    </div>
  )
}

export function FlashAuditWidget() {
  const [url, setUrl] = useState('')
  const [state, setState] = useState<State>({ phase: 'idle' })
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    return () => abortRef.current?.abort()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!url.trim()) return

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setState({ phase: 'loading' })

    const raw = url.trim()
    const urlStr = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`

    try {
      const res = await fetch('/api/audit/flash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlStr }),
        signal: controller.signal,
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        if (res.status === 429) {
          setState({
            phase: 'error',
            message: body.error ?? 'Limite atteinte : 5 analyses par heure. Réessayez plus tard.',
          })
          return
        }
        setState({
          phase: 'error',
          message: body.error ?? 'Erreur lors de l\'analyse.',
        })
        return
      }

      const data: FlashAuditResult = await res.json()
      setState({ phase: 'result', data })
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      setState({
        phase: 'error',
        message: 'Impossible d\'atteindre le serveur. Vérifiez votre connexion.',
      })
    }
  }

  function handleReset() {
    abortRef.current?.abort()
    setState({ phase: 'idle' })
  }

  const ctaHref =
    state.phase === 'result'
      ? `/login?redirect=${encodeURIComponent('/dashboard/audits/new')}&url=${encodeURIComponent(state.data.url)}`
      : '/login'

  return (
    <div
      className="w-full max-w-xl mx-auto rounded-2xl p-6"
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
      }}
    >
      {/* --- Input form (always visible) --- */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://monsite.com"
          aria-label="URL de votre site"
          disabled={state.phase === 'loading'}
          className="flex-1 px-4 py-3 rounded-xl text-sm font-[family-name:var(--font-sans)] focus:outline-none transition-colors"
          style={{
            background: 'var(--color-bg)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text)',
          }}
        />
        <button
          type="submit"
          disabled={state.phase === 'loading' || !url.trim()}
          className="btn-primary px-5 py-3 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {state.phase === 'loading' ? '…' : 'Analyser'}
        </button>
      </form>

      {/* --- Loading state --- */}
      {state.phase === 'loading' && (
        <div className="mt-5" style={{ animation: 'flash-fade-in 200ms ease both' }}>
          <div
            className="h-1.5 rounded-full overflow-hidden"
            style={{ background: 'var(--color-border)' }}
          >
            <div
              className="h-full rounded-full"
              style={{
                background: 'var(--color-accent)',
                animation: 'flash-progress 12s cubic-bezier(0.1, 0.3, 0.6, 0.9) forwards',
              }}
            />
          </div>
          <p
            className="mt-3 text-xs text-center font-[family-name:var(--font-sans)]"
            style={{ color: 'var(--color-muted)' }}
          >
            Analyse en cours… (8-12 secondes)
          </p>
        </div>
      )}

      {/* --- Error state --- */}
      {state.phase === 'error' && (
        <div
          className="mt-4 px-4 py-3 rounded-xl text-sm font-[family-name:var(--font-sans)]"
          style={{
            background: 'color-mix(in srgb, var(--color-red) 10%, transparent)',
            border: '1px solid color-mix(in srgb, var(--color-red) 30%, transparent)',
            color: 'var(--color-red)',
            animation: 'flash-fade-in 200ms ease both',
          }}
          role="alert"
        >
          {state.message}
        </div>
      )}

      {/* --- Result state --- */}
      {state.phase === 'result' && (
        <div
          className="mt-5 flex flex-col gap-4"
          style={{ animation: 'flash-fade-in 300ms ease both' }}
        >
          {/* Score global */}
          <div className="flex items-center gap-4">
            <AnimatedScore target={state.data.score} />
            <div className="flex-1 flex flex-col gap-0.5">
              <span
                className="text-xs font-[family-name:var(--font-sans)]"
                style={{ color: 'var(--color-muted)' }}
              >
                Score global
              </span>
              <span
                className="text-xs font-[family-name:var(--font-sans)]"
                style={{ color: 'var(--color-muted)' }}
              >
                {state.data.totalFindings} problèmes détectés
              </span>
            </div>
          </div>

          {/* Barres par phase */}
          <div
            className="rounded-xl p-4 flex flex-col gap-3"
            style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}
          >
            <PhaseBar phase={state.data.phases.technical} />
            <PhaseBar phase={state.data.phases.geo} />
            <PhaseBar phase={state.data.phases.structured_data} />
            <PhaseBar phase={state.data.phases.common_mistakes} />
          </div>

          {/* Top findings (blurrés) */}
          {state.data.topFindings.length > 0 && (
            <div className="flex flex-col gap-2">
              <p
                className="text-xs font-[family-name:var(--font-display)] font-semibold uppercase tracking-wider"
                style={{ color: 'var(--color-muted)' }}
              >
                Problèmes prioritaires
              </p>
              {state.data.topFindings.map((f, i) => (
                <div
                  key={i}
                  className="rounded-xl px-4 py-3"
                  style={{
                    background: 'var(--color-bg)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <div className="flex items-start gap-2">
                    <span
                      className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                      style={{ background: SEVERITY_COLOR[f.severity] ?? 'var(--color-muted)' }}
                      aria-hidden="true"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-[family-name:var(--font-sans)] font-medium leading-snug">
                        {f.title}
                      </p>
                      <p
                        className="mt-0.5 text-xs font-[family-name:var(--font-sans)] leading-snug select-none"
                        style={{
                          color: 'var(--color-muted)',
                          filter: 'blur(3.5px)',
                          userSelect: 'none',
                        }}
                        aria-hidden="true"
                      >
                        {f.recommendation}
                      </p>
                    </div>
                    {f.pointsLost > 0 && (
                      <span
                        className="text-xs font-[family-name:var(--font-display)] font-semibold tabular-nums shrink-0"
                        style={{ color: SEVERITY_COLOR[f.severity] ?? 'var(--color-muted)' }}
                      >
                        -{f.pointsLost}pt
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* CTA */}
          <a href={ctaHref} className="btn-primary text-center w-full mt-1">
            Voir l&apos;analyse complète — créer un compte gratuit
          </a>

          <button
            type="button"
            onClick={handleReset}
            className="text-xs text-center font-[family-name:var(--font-sans)]"
            style={{ color: 'var(--color-muted)' }}
          >
            Analyser un autre site
          </button>
        </div>
      )}
    </div>
  )
}
