import { PHASE_ORDER } from './engine'
import type { PhaseKey } from './types'

export type AuditMode = 'flash' | 'standard' | 'full'

export interface ModeConfig {
  phases: PhaseKey[]
  maxSubPages: number
  timeoutMs: number
}

export const AUDIT_MODE_CONFIGS: Record<AuditMode, ModeConfig> = {
  flash: {
    phases: ['technical', 'structured_data', 'geo', 'common_mistakes'],
    maxSubPages: 0,
    timeoutMs: 15_000,
  },
  standard: {
    phases: [
      'technical',
      'structured_data',
      'geo',
      'entity',
      'eeat',
      'freshness',
      'common_mistakes',
      'synthesis',
    ],
    maxSubPages: 3,
    timeoutMs: 120_000,
  },
  full: {
    phases: PHASE_ORDER,
    maxSubPages: 20,
    timeoutMs: 600_000,
  },
}

export function resolveModeConfig(mode: string | null | undefined): ModeConfig {
  if (mode === 'flash') return AUDIT_MODE_CONFIGS.flash
  if (mode === 'standard') return AUDIT_MODE_CONFIGS.standard
  return AUDIT_MODE_CONFIGS.full
}
