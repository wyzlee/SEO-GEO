export type Frequency = 'daily' | 'weekly' | 'monthly'

export function computeNextRunAt(frequency: Frequency, fromDate: Date): Date {
  const d = new Date(fromDate)
  if (frequency === 'daily') d.setDate(d.getDate() + 1)
  else if (frequency === 'weekly') d.setDate(d.getDate() + 7)
  else d.setMonth(d.getMonth() + 1)
  return d
}
