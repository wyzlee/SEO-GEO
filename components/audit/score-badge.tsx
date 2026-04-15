import { cn } from '@/lib/utils'

export function ScoreBadge({
  score,
  size = 'md',
}: {
  score: number
  size?: 'sm' | 'md' | 'lg'
}) {
  const dim = size === 'sm' ? 48 : size === 'lg' ? 96 : 72
  const text = size === 'sm' ? 18 : size === 'lg' ? 36 : 28

  let bg = 'var(--color-red)'
  if (score >= 80) bg = 'var(--color-green)'
  else if (score >= 60) bg = 'var(--color-blue)'
  else if (score >= 40) bg = 'var(--color-amber)'

  const textColor = score >= 40 && score < 60 ? '#1a1a1a' : '#fff'

  return (
    <div
      className={cn(
        'inline-flex flex-col items-center justify-center rounded-full shrink-0',
      )}
      style={{
        width: dim,
        height: dim,
        background: bg,
        color: textColor,
      }}
      aria-label={`Score ${score} sur 100`}
    >
      <span
        className="font-bold font-[family-name:var(--font-display)] leading-none"
        style={{ fontSize: text }}
      >
        {Math.round(score)}
      </span>
      <span
        className="font-[family-name:var(--font-sans)] opacity-80 leading-none mt-1"
        style={{ fontSize: Math.round(text * 0.34) }}
      >
        /&thinsp;100
      </span>
    </div>
  )
}
