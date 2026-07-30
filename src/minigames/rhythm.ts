import type { RhythmConfig, MinigameDef } from '@/content/minigame-schema';
import type { RhythmState, MinigameInput, MinigameResult } from './types';
import { timingAccuracy, mean } from './scoring';

export function initRhythm(def: MinigameDef & { type: 'rhythm' }): RhythmState {
  return {
    id: def.id,
    type: 'rhythm',
    phase: 'playing',
    tick: 0,
    hits: [],
    nextBeatIndex: 0,
  };
}

export function stepRhythm(
  def: MinigameDef & { type: 'rhythm' },
  state: RhythmState,
  input: MinigameInput,
): RhythmState {
  const config = def.config as RhythmConfig;
  if (state.phase !== 'playing') return state;

  switch (input.type) {
    case 'TAP': {
      const beat = config.beats[state.nextBeatIndex];
      if (beat === undefined) return state;
      const accuracy = timingAccuracy(input.nowTick, beat, config.window);
      if (accuracy > 0) {
        return {
          ...state,
          hits: [...state.hits, accuracy],
          nextBeatIndex: state.nextBeatIndex + 1,
        };
      }
      return state;
    }
    case 'TICK':
      return { ...state, tick: state.tick + input.dt };
    case 'ABORT':
      return { ...state, phase: 'aborted' };
    default:
      return state;
  }
}

export function isRhythmTerminal(state: RhythmState, config: RhythmConfig): boolean {
  if (state.phase === 'aborted') return true;
  if (state.nextBeatIndex >= config.beats.length) return true;
  const lastBeat = config.beats[config.beats.length - 1];
  if (lastBeat === undefined) return true;
  return state.tick > lastBeat + config.window;
}

export function scoreRhythm(
  _def: MinigameDef & { type: 'rhythm' },
  state: RhythmState,
): Omit<MinigameResult, 'tierIndex' | 'rewards' | 'summary_sid'> {
  const score = state.hits.length > 0 ? mean(state.hits) * 100 : 0;
  return { score };
}
