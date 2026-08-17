// Studio session snapshot — durable bench state, not the life-chain SaveBlob.
//
// v1: benches keyed by tier id, a shared archive, per-tier progression state.
// v0 payloads are migrated by ./studio-session-v0. Pure: no Date, no
// platform APIs. Bigints are decimal strings. Invalid payloads throw so the
// persistence layer can treat them as absent.
//
// Hydration (and the default/empty session baseline) lives in
// ./studio-session-hydrate and is re-exported below so the public surface
// (the @/engine barrel and direct importers) does not change. The runtime
// edge is one-way: this module → studio-session-hydrate.

import { z } from 'zod';

import { studioToBench } from './bench-mapping';
import { ManifestSchema } from './manifest';
import { parseManifest } from './manifest-migration';
import type { StudioState } from './operations';
import {
  DevelopOperationSchema,
  IdleSliceSchema,
  LifeSliceSchema,
  MemberSliceSchema,
  PracticeSliceSchema,
  ResidueEventSchema,
  STUDIO_SESSION_V0_VERSION,
  StudioSessionV0Schema,
  WorldDraftReferenceSchema,
  migrateStudioSessionV0,
} from './studio-session-v0';
import { defaultProgression, type SessionProgression } from './studio-session-hydrate';
import { TierStateSchema } from './tier-state';
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
    // Household-bench only: person-bench events the fold-up has already
    // consumed, so sub-cadence batches combine across stepSession calls.
    fold_position: z.number().int().min(0).default(0),
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
    members: z.record(z.string(), MemberSliceSchema).default(() => ({})),
    world_drafts: z.array(WorldDraftReferenceSchema).default(() => []),
    last_visited_at_unix: z.number().optional(),
  })
  .strict();

export type StudioSession = z.infer<typeof StudioSessionSchema>;

export function snapshotStudioSession(
  studio: StudioState,
  idle: IdleState,
  life: LifeState,
  practices: readonly Practice[],
  lastVisitedAtUnix?: number,
  progression: SessionProgression = defaultProgression(),
  extras?: {
    members?: Record<string, z.infer<typeof MemberSliceSchema>>;
    world_drafts?: readonly z.infer<typeof WorldDraftReferenceSchema>[];
  },
): StudioSession {
  const members = extras?.members ?? {};
  const world_drafts = extras?.world_drafts ?? [];
  return StudioSessionSchema.parse({
    schema_version: STUDIO_SESSION_VERSION,
    benches: {
      person: studioToBench(studio),
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
    members,
    world_drafts,
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

export {
  defaultProgression,
  emptyHydratedSession,
  hydrateStudioSession,
} from './studio-session-hydrate';
export type { HydratedStudioSession, SessionProgression } from './studio-session-hydrate';

export type MemberSlice = z.infer<typeof MemberSliceSchema>;
export type WorldDraftReference = z.infer<typeof WorldDraftReferenceSchema>;
