/**
 * Audit engine constants.
 *
 * Historically housed the orchestration logic ; that moved to
 * `lib/audit/process.ts` when it grew DB / worker concerns. Only the
 * immutable rubric stays here (imported by process.ts, persist.ts and
 * the report renderer) so the constants are defined once.
 */

import { TECHNICAL_SCORE_MAX } from './phases/technical'
import type { PhaseKey } from './types'

export const PHASE_ORDER: PhaseKey[] = [
  'technical',
  'structured_data',
  'geo',
  'entity',
  'eeat',
  'freshness',
  'international',
  'performance',
  'topical',
  'common_mistakes',
  'synthesis',
]

export const PHASE_SCORE_MAX: Record<PhaseKey, number> = {
  technical: TECHNICAL_SCORE_MAX,
  structured_data: 15,
  geo: 18,
  entity: 10,
  eeat: 10,
  freshness: 8,
  international: 8,
  performance: 8,
  topical: 6,
  common_mistakes: 5,
  synthesis: 0,
}
