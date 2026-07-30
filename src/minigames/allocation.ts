/**
 * Alms allocation minigame engine — pure & deterministic.
 *
 * The player distributes a fixed budget among recipients with differing
 * needs; the session is scored by fairness (how well allocations match
 * needs, within budget). All timing uses virtual ticks; there is no
 * wall-clock, global RNG, or platform API here — this mirrors the
 * runtime-purity fence enforced across `@yakshetra/minigames`.
 *
 * `scoreAllocation` returns only the numeric `score`; tier selection and
 * reward/summary resolution are the caller's concern, so they can be wired
 * to the reward-tier table (`pickRewardTier`) at the seam layer.
 *
 * Imports are TYPE-ONLY for the content schema (erased at compile time →
 * zero runtime coupling) plus the pure scoring helper from this package.
 */

import type { AllocationConfig, MinigameDef } from '@/content/minigame-schema';
import type { AllocationState, MinigameInput, MinigameResult } from './types';
import { fairnessScore } from './scoring';

export function initAllocation(def: MinigameDef & { type: 'allocation' }): AllocationState {
  return {
    id: def.id,
    type: 'allocation',
    phase: 'playing',
    tick: 0,
    allocations: {},
    submitted: false,
  };
}

export function stepAllocation(
  _def: MinigameDef & { type: 'allocation' },
  state: AllocationState,
  input: MinigameInput,
): AllocationState {
  if (state.phase !== 'playing') return state;

  switch (input.type) {
    case 'ALLOCATE':
      return { ...state, allocations: input.allocations, submitted: true };
    case 'TICK':
      return { ...state, tick: state.tick + input.dt };
    case 'ABORT':
      return { ...state, phase: 'aborted' };
    default:
      return state;
  }
}

export function isAllocationTerminal(state: AllocationState): boolean {
  return state.submitted || state.phase === 'aborted';
}

export function scoreAllocation(
  def: MinigameDef & { type: 'allocation' },
  state: AllocationState,
): Omit<MinigameResult, 'tierIndex' | 'rewards' | 'summary_sid'> {
  const config = def.config as AllocationConfig;
  const score = fairnessScore(state.allocations, config.recipients, config.budget);
  return { score };
}
