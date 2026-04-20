'use client'

import { useEffect, useState } from 'react'

interface ScoreRingProps {
  score: number
  size?: 'sm' | 'lg'
  animated?: boolean
  label?: string
}

function scoreColor(score: number): string {
  if (score >= 90) return 'var(--color-accent)'
  if (score >= 70) return 'var(--color-green)'
  if (score >= 40) return 'var(--color-amber)'
  return 'var(--color-red)'
}

export function ScoreRing({ score, size = 'sm', animated = true, label }: ScoreRingProps) {
  const dim = size === 'lg' ? 120 : 80
  const strokeWidth = size === 'lg' ? 8 : 6
  const radius = (dim - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const targetDash = (Math.min(Math.max(score, 0), 100) / 100) * circumference

  const [dashOffset, setDashOffset] = useState(circumference)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mq.matches)

    const onChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    const shouldAnimate = animated && !prefersReducedMotion
    if (!shouldAnimate) {
      setDashOffset(circumference - targetDash)
      return
    }
    const timer = setTimeout(() => setDashOffset(circumference - targetDash), 50)
    return () => clearTimeout(timer)
  }, [score, animated, circumference, targetDash, prefersReducedMotion])

  const color = scoreColor(score)
  const fontSize = size === 'lg' ? 24 : 16
  const transitionDuration = prefersReducedMotion ? '0.01ms' : '800ms'
  const roundedScore = Math.round(score)

  return (
    <div
      className="flex flex-col items-center gap-1"
      role="img"
      aria-label={`Score ${roundedScore} sur 100`}
    >
      <svg
        width={dim}
        height={dim}
        viewBox={`0 0 ${dim} ${dim}`}
        aria-hidden="true"
        focusable="false"
      >
        {/* Track (fond) */}
        <circle
          cx={dim / 2}
          cy={dim / 2}
          r={radius}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth={strokeWidth}
        />
        {/* Arc animé — tourné -90° autour du centre pour démarrer en haut */}
        <circle
          cx={dim / 2}
          cy={dim / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${dim / 2} ${dim / 2})`}
          style={{
            transition: `stroke-dashoffset ${transitionDuration} ease-out`,
          }}
        />
        {/* Score au centre */}
        <text
          x="50%"
          y="50%"
          dominantBaseline="middle"
          textAnchor="middle"
          style={{
            fill: 'var(--color-text)',
            fontSize: `${fontSize}px`,
            fontWeight: 700,
            fontFamily: 'var(--font-display)',
          }}
        >
          {roundedScore}
        </text>
      </svg>
      {label && (
        <span
          className="text-xs font-[family-name:var(--font-sans)]"
          style={{ color: 'var(--color-muted)' }}
        >
          {label}
        </span>
      )}
    </div>
  )
}
