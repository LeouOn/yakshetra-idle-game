// Studio session hydration — snapshot → runtime overlay, plus the empty
// baseline. Split out of studio-session.ts so that module is just schema +
// snapshot/parse.
//
// defaultProgression / SessionProgression live here (not in studio-session)
// because emptyHydratedSession needs the value while this module must keep
// its studio-session dependency TYPE-ONLY — studio-session re-exports these
// for the unchanged public surface. The one-way runtime edge is
// studio-session → studio-session-hydrate. Pure: no Date, no platform APIs.

import { benchToStudio } from './bench-mapping';
import { createIdleState } from './idle';
import { createStudioState } from './operations';
import type { StudioState } from './operations';
import { createLifeState } from './reducer';
import { createTierState } from './tier-state';
import type { TierState } from './tier-state';
import type { MemberSlice, StudioSession, WorldDraftReference } from './studio-session';
import type { IdleState, LifeState, Practice } from './types';

export interface SessionProgression {
  readonly tiers: Readonly<Record<string, TierState>>;
  readonly milestones_done: readonly string[];
  readonly compendium_done: readonly string[];
  readonly embodied_member: { readonly tier: string; readonly member: string } | null;
}

export function defaultProgression(): SessionProgression {
  return {
    tiers: { person: createTierState('person', true) },
    milestones_done: [],
    compendium_done: [],
    embodied_member: null,
  };
}

export interface HydratedStudioSession {
  readonly studio: StudioState;
  readonly idle: IdleState;
  readonly life: LifeState;
  readonly practices: Practice[];
  readonly progression: SessionProgression;
  readonly members: Record<string, MemberSlice>;
  readonly world_drafts: readonly WorldDraftReference[];
}

/** Overlay a snapshot onto a fresh bench (identity/era stay on `baseLife`). */
export function hydrateStudioSession(
  session: StudioSession,
  baseLife: LifeState,
  packPractices: readonly Practice[],
): HydratedStudioSession {
  const progress = new Map(session.practices.map((p) => [p.id, p]));
  const practices = packPractices.map((practice) => {
    const saved = progress.get(practice.id);
    if (saved === undefined) {
      return practice;
    }
    return {
      ...practice,
      currentProgress: saved.currentProgress,
      level: saved.level,
    };
  });
  const idle: IdleState = {
    mode: session.idle.mode,
    lastSimulatedTick: BigInt(session.idle.last_simulated_tick),
    totalIdleTicks: BigInt(session.idle.total_idle_ticks),
  };
  const life: LifeState = {
    ...baseLife,
    turn: session.life.turn,
    resources: { ...baseLife.resources, ...session.life.resources },
    skills: { ...session.life.skills },
    residue: session.life.residue,
  };
  const bench = session.benches['person'];
  const studio: StudioState =
    bench === undefined
      ? { ...createStudioState(), archive: session.archive }
      : benchToStudio(bench, session.archive);
  return {
    studio,
    idle,
    life,
    practices,
    progression: {
      tiers: session.tiers,
      milestones_done: session.milestones_done,
      compendium_done: session.compendium_done,
      embodied_member: session.embodied_member,
    },
    members: session.members,
    world_drafts: session.world_drafts,
  };
}

/** Empty session helpers for tests that need a known baseline. */
export function emptyHydratedSession(baseLife?: LifeState): HydratedStudioSession {
  const life =
    baseLife ??
    createLifeState({
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
    studio: createStudioState(),
    idle: createIdleState(),
    life,
    practices: [],
    progression: defaultProgression(),
    members: {},
    world_drafts: [],
  };
}
