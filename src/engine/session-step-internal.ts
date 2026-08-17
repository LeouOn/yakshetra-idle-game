// Session-step internals — pure helpers under `stepSession`.
//
// Split out of session-step.ts so that module is a single public `stepSession`
// plus its context/summary types. Everything here is step-local shaping: the
// life/idle/practices chassis rebuilt from session slices, and the fold-copy
// filter. Pure: no Date, no network, no global RNG; studio-session is
// TYPE-ONLY.

import { createLifeState } from './reducer';
import { foldUpEvents } from './roster-fold';
import type { ResidueEvent } from './residue';
import type { StudioSession } from './studio-session';
import type { IdleState, LifeState, Practice } from './types';

/** Studio-bench chassis under the session's life slice (identity stays out). */
export function benchLife(session: StudioSession): LifeState {
  const chassis = createLifeState({
    id: 'studio-bench' as LifeState['id'],
    era: 'studio-bench@0.1.0' as LifeState['era'],
    role: 'operator' as LifeState['role'],
    identity: {
      gender: 'unspecified',
      social_class: 'operator',
      family_wealth_at_birth: 'unspecified',
      caste_status: 'none',
      disability_status: 'none',
    },
  });
  return {
    ...chassis,
    turn: session.life.turn,
    resources: { ...chassis.resources, ...session.life.resources },
    skills: { ...session.life.skills },
    residue: session.life.residue,
  };
}

export function benchIdle(session: StudioSession): IdleState {
  return {
    mode: session.idle.mode,
    lastSimulatedTick: BigInt(session.idle.last_simulated_tick),
    totalIdleTicks: BigInt(session.idle.total_idle_ticks),
  };
}

/** Overlay saved session progress onto the ctx runtime practices. */
export function overlayPractices(
  runtime: readonly Practice[],
  saved: StudioSession['practices'],
): Practice[] {
  const progress = new Map(saved.map((p) => [p.id, p]));
  return runtime.map((practice) => {
    const slice = progress.get(practice.id);
    if (slice === undefined) {
      return practice;
    }
    return { ...practice, currentProgress: slice.currentProgress, level: slice.level };
  });
}

/** Tag every cadence-th event with `sourceId` and keep only the marked
 * copies — the parent bench receives marked events only. Members pass
 * cadence 1 (every event); the person bench passes the tier cadence. */
export function foldCopies(
  events: readonly ResidueEvent[],
  sourceId: string,
  cadence: number,
  counter: number,
): readonly ResidueEvent[] {
  const { events: marked } = foldUpEvents(events, sourceId, cadence, counter);
  return marked.filter((event) => event.ids.includes(sourceId));
}
