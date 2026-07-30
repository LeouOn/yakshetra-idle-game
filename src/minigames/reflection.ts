/**
 * Pure karma-reflection minigame engine.
 *
 * The reflection minigame is a deterministic choice-tree: from a root node the
 * player picks an option, collects that option's insight, and either advances
 * to the option's `next` node or terminates (`next === null`). All transitions
 * are pure functions of (def, state, input) — no wall-clock, no global RNG, no
 * platform APIs — so a session can be replayed bit-for-bit from recorded inputs.
 *
 * The only imports are TYPE-ONLY (`import type`), erased at compile time, so
 * there is zero runtime coupling to the content package (mirrors the
 * runtime-purity fence enforced across `@yakshetra/minigames`).
 */

import type { MinigameDef, ReflectionConfig } from '@/content/minigame-schema';
import type { MinigameInput, MinigameResult, ReflectionState } from './types';

export function initReflection(def: MinigameDef & { type: 'reflection' }): ReflectionState {
  const config = def.config as ReflectionConfig;
  return {
    id: def.id,
    type: 'reflection',
    phase: 'playing',
    tick: 0,
    currentNodeId: config.root_node,
    insightsCollected: [],
    path: [config.root_node],
  };
}

export function stepReflection(
  def: MinigameDef & { type: 'reflection' },
  state: ReflectionState,
  input: MinigameInput,
): ReflectionState {
  const config = def.config as ReflectionConfig;
  if (state.phase !== 'playing') return state;

  switch (input.type) {
    case 'CHOOSE': {
      const node = config.nodes.find((n) => n.id === input.nodeId);
      if (!node) return state;
      const option = node.options.find((o) => o.id === input.optionId);
      if (!option) return state;
      const newInsights = [...state.insightsCollected, option.insight_sid];
      const newPath = [...state.path, input.optionId];
      if (option.next === null) {
        return { ...state, phase: 'resolved', insightsCollected: newInsights, path: newPath };
      }
      return {
        ...state,
        currentNodeId: option.next,
        insightsCollected: newInsights,
        path: newPath,
      };
    }
    case 'TICK':
      return { ...state, tick: state.tick + input.dt };
    case 'ABORT':
      return { ...state, phase: 'aborted' };
    default:
      return state;
  }
}

export function isReflectionTerminal(state: ReflectionState): boolean {
  return state.phase === 'resolved' || state.phase === 'aborted';
}

export function scoreReflection(
  def: MinigameDef & { type: 'reflection' },
  state: ReflectionState,
): Omit<MinigameResult, 'tierIndex' | 'rewards' | 'summary_sid'> {
  const config = def.config as ReflectionConfig;
  const totalInsights = config.nodes.reduce((acc, n) => acc + n.options.length, 0);
  const score = totalInsights > 0 ? (state.insightsCollected.length / totalInsights) * 100 : 0;
  return { score: Math.max(0, Math.min(100, score)) };
}
