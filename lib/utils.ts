import { twMerge } from 'tailwind-merge'

type ClassValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | ClassValue[]
  | Record<string, boolean | null | undefined>

function flatten(input: ClassValue): string[] {
  if (!input) return []
  if (typeof input === 'string') return [input]
  if (typeof input === 'number') return [String(input)]
  if (Array.isArray(input)) return input.flatMap(flatten)
  if (typeof input === 'object') {
    return Object.entries(input)
      .filter(([, v]) => Boolean(v))
      .map(([k]) => k)
  }
  return []
}

export function cn(...inputs: ClassValue[]): string {
  return twMerge(inputs.flatMap(flatten).join(' '))
}
