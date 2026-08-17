// Residue log — fiction-agnostic traces of work already done.
//
// Events carry ids and numbers only. A later compiler (table or model) reads
// a window of this log to fill a Manifest. Pure: no Date, no Math.random.

import type { LifeState } from './types';

/** Closed set of residue kinds emitted in v0. */
export type ResidueEventType =
  | 'practice_tick'
  | 'practice_level'
  | 'lens_chosen'
  | 'event_resolved'
  | 'resource_edge'
  | 'life_ended';

/** One structured trace. No prose — the compiler writes sentences. */
export interface ResidueEvent {
  readonly tick: number;
  readonly type: ResidueEventType;
  readonly ids: readonly string[];
  readonly numbers: Readonly<Record<string, number>>;
}

/** Counts and dominant ids over a window — input to the compiler. */
export interface ResidueSummary {
  readonly count: number;
  readonly firstTick: number;
  readonly lastTick: number;
  readonly typeCounts: Readonly<Record<ResidueEventType, number>>;
  readonly dominantType: ResidueEventType | null;
  readonly ids: readonly string[];
}

const EMPTY_COUNTS: Record<ResidueEventType, number> = {
  practice_tick: 0,
  practice_level: 0,
  lens_chosen: 0,
  event_resolved: 0,
  resource_edge: 0,
  life_ended: 0,
};

const TYPE_ORDER: readonly ResidueEventType[] = [
  'practice_level',
  'event_resolved',
  'practice_tick',
  'lens_chosen',
  'resource_edge',
  'life_ended',
];

/** Read the residue log, treating a missing field as empty. */
export function residueLog(state: LifeState): readonly ResidueEvent[] {
  return state.residue ?? [];
}

/** Append one event. Does not mutate `log`. */
export function appendResidue(
  log: readonly ResidueEvent[],
  event: ResidueEvent,
): readonly ResidueEvent[] {
  return [...log, event];
}

/** Events strictly after `afterIndex` (-1 = whole log). */
export function windowSince(
  log: readonly ResidueEvent[],
  afterIndex: number,
): readonly ResidueEvent[] {
  if (afterIndex < 0) {
    return log;
  }
  return log.slice(afterIndex + 1);
}

/** Stable id for a window, derived only from its ticks and length. */
export function residueWindowId(window: readonly ResidueEvent[]): string {
  if (window.length === 0) {
    return 'w-empty';
  }
  const first = window[0];
  const last = window[window.length - 1];
  const firstTick = first === undefined ? 0 : first.tick;
  const lastTick = last === undefined ? 0 : last.tick;
  return `w-${firstTick}-${lastTick}-${window.length}`;
}

/** Compress a window into counts and a dominant type. */
export function summarizeResidue(window: readonly ResidueEvent[]): ResidueSummary {
  const typeCounts: Record<ResidueEventType, number> = { ...EMPTY_COUNTS };
  const idSet: string[] = [];
  for (const event of window) {
    typeCounts[event.type] += 1;
    for (const id of event.ids) {
      if (!idSet.includes(id)) {
        idSet.push(id);
      }
    }
  }
  let dominantType: ResidueEventType | null = null;
  for (const type of TYPE_ORDER) {
    if (typeCounts[type] > 0) {
      dominantType = type;
      break;
    }
  }
  const first = window[0];
  const last = window[window.length - 1];
  return {
    count: window.length,
    firstTick: first === undefined ? 0 : first.tick,
    lastTick: last === undefined ? 0 : last.tick,
    typeCounts,
    dominantType,
    ids: idSet,
  };
}

/** Append `event` onto a life, returning a NEW state. */
export function recordLifeResidue(state: LifeState, event: ResidueEvent): LifeState {
  return { ...state, residue: appendResidue(residueLog(state), event) };
}
