// Studio session snapshot — durable bench state, not the life-chain SaveBlob.
//
// v1: benches keyed by tier id, a shared archive, per-tier progression state.
// v0 payloads are migrated by ./studio-session-v0. Pure: no Date, no
// platform APIs. Bigints are decimal strings. Invalid payloads throw so the
// persistence layer can treat them as absent.

import { z } from 'zod';

import { createIdleState } from './idle';
import { ManifestSchema } from './manifest';
import { parseManifest } from './manifest-migration';
import { createStudioState, type StudioState } from './operations';
import { createLifeState } from './reducer';
import {
  DevelopOperationSchema,
  IdleSliceSchema,
  LifeSliceSchema,
  PracticeSliceSchema,
  ResidueEventSchema,
  STUDIO_SESSION_V0_VERSION,
  StudioSessionV0Schema,
  migrateStudioSessionV0,
} from './studio-session-v0';
import { TierStateSchema, createTierState, type TierState } from './tier-state';
import type { IdleState, LifeState, Practice } from './types';

export const STUDIO_SESSION_VERSION = 'studio_session/v1' as const;

const PlayImportSchema = z
  .object({
    life_id: z.string().min(1),
    index: z.number().int().min(-1),
  })
  .strict();

const PinnedSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    kind: z.enum(['person', 'place']),
    one_liner: z.string().min(1),
  })
  .strict();

const BenchSchema = z
  .object({
    residue: z.array(ResidueEventSchema),
    last_harvest_index: z.number().int().min(-1),
    bay: DevelopOperationSchema.nullable(),
    quality_tier: z.number().int().min(0),
    harvest_count: z.number().int().min(0),
    play_import: PlayImportSchema.nullable(),
    pinned: PinnedSchema.nullable(),
    surplus: z.number().int().min(0),
  })
  .strict();

export type BenchState = z.infer<typeof BenchSchema>;

const EmbodiedMemberSchema = z
  .object({
    tier: z.string().min(1),
    member: z.string().min(1),
  })
  .strict();

export const StudioSessionSchema = z
  .object({
    schema_version: z.literal(STUDIO_SESSION_VERSION),
    benches: z.record(z.string(), BenchSchema),
    archive: z.array(z.preprocess((card) => parseManifest(card), ManifestSchema)),
    tiers: z.record(z.string(), TierStateSchema),
    milestones_done: z.array(z.string().min(1)),
    compendium_done: z.array(z.string().min(1)),
    embodied_member: EmbodiedMemberSchema.nullable(),
    idle: IdleSliceSchema,
    life: LifeSliceSchema,
    practices: z.array(PracticeSliceSchema),
    last_visited_at_unix: z.number().optional(),
  })
  .strict();

export type StudioSession = z.infer<typeof StudioSessionSchema>;

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

export function snapshotStudioSession(
  studio: StudioState,
  idle: IdleState,
  life: LifeState,
  practices: readonly Practice[],
  lastVisitedAtUnix?: number,
  progression: SessionProgression = defaultProgression(),
): StudioSession {
  return StudioSessionSchema.parse({
    schema_version: STUDIO_SESSION_VERSION,
    benches: {
      person: {
        residue: studio.residue,
        last_harvest_index: studio.last_harvest_index,
        bay: studio.bay,
        quality_tier: studio.quality_tier,
        harvest_count: studio.harvest_count,
        play_import: studio.play_import,
        pinned: studio.pinned,
        surplus: studio.surplus,
      },
    },
    archive: studio.archive,
    tiers: progression.tiers,
    milestones_done: progression.milestones_done,
    compendium_done: progression.compendium_done,
    embodied_member: progression.embodied_member,
    idle: {
      mode: idle.mode,
      last_simulated_tick: idle.lastSimulatedTick.toString(10),
      total_idle_ticks: idle.totalIdleTicks.toString(10),
    },
    life: {
      turn: life.turn,
      resources: { ...life.resources },
      skills: { ...life.skills },
      residue: [...(life.residue ?? [])],
    },
    practices: practices.map((p) => ({
      id: p.id,
      currentProgress: p.currentProgress,
      level: p.level,
    })),
    ...(lastVisitedAtUnix === undefined ? {} : { last_visited_at_unix: lastVisitedAtUnix }),
  });
}

/** Parse a session payload of any supported version, migrating v0 to v1. */
export function parseStudioSession(raw: unknown): StudioSession {
  if (
    typeof raw === 'object' &&
    raw !== null &&
    (raw as { schema_version?: unknown }).schema_version === STUDIO_SESSION_V0_VERSION
  ) {
    return migrateStudioSessionV0(StudioSessionV0Schema.parse(raw));
  }
  return StudioSessionSchema.parse(raw);
}

export interface HydratedStudioSession {
  readonly studio: StudioState;
  readonly idle: IdleState;
  readonly life: LifeState;
  readonly practices: Practice[];
  readonly progression: SessionProgression;
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
  const base = createStudioState();
  const studio: StudioState =
    bench === undefined
      ? { ...base, archive: session.archive }
      : {
          residue: bench.residue,
          last_harvest_index: bench.last_harvest_index,
          bay: bench.bay === null ? null : { ...bench.bay, focus: bench.bay.focus ?? null },
          archive: session.archive,
          quality_tier: bench.quality_tier,
          harvest_count: bench.harvest_count,
          play_import: bench.play_import,
          pinned: bench.pinned,
          surplus: bench.surplus,
        };
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
  };
}
