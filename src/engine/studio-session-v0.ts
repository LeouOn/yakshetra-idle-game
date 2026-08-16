// Legacy studio_session/v0 schema and its migration to v1.
//
// This module also owns the shared leaf schemas (residue events, develop
// operations) reused by the v1 session — they originated with v0 and have
// not changed shape. Pure: no Date, no platform APIs.

import { z } from 'zod';

import { ManifestSchema } from './manifest';
import { parseManifest } from './manifest-migration';
import { createTierState } from './tier-state';
import type { StudioSession } from './studio-session';

export const STUDIO_SESSION_V0_VERSION = 'studio_session/v0' as const;

export const ResidueEventSchema = z
  .object({
    tick: z.number().int(),
    type: z.enum([
      'practice_tick',
      'practice_level',
      'lens_chosen',
      'event_resolved',
      'resource_edge',
      'life_ended',
    ]),
    ids: z.array(z.string()),
    numbers: z.record(z.string(), z.number()),
  })
  .strict();

export const DevelopOperationSchema = z
  .object({
    id: z.string().min(1),
    type: z.literal('develop_from_residue'),
    residue_window_id: z.string().min(1),
    residue: z.array(ResidueEventSchema),
    brief: z.string().nullable(),
    cook_ticks_total: z.number().int().nonnegative(),
    cook_ticks_done: z.number().int().nonnegative(),
    status: z.enum(['cooking', 'ready', 'harvested']),
    rng_seed: z.string().min(1),
    focus: z
      .object({
        id: z.string().min(1),
        name: z.string().min(1),
        kind: z.enum(['person', 'place']),
        one_liner: z.string().min(1),
      })
      .nullable()
      .optional(),
  })
  .strict();

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

const StudioStateV0Schema = z
  .object({
    residue: z.array(ResidueEventSchema),
    last_harvest_index: z.number().int().min(-1),
    bay: DevelopOperationSchema.nullable(),
    archive: z.array(z.unknown()),
    quality_tier: z.number().int().min(0),
    harvest_count: z.number().int().min(0),
    play_import: PlayImportSchema.nullable().optional(),
    pinned: PinnedSchema.nullable().optional(),
    surplus: z.number().int().min(0).optional(),
  })
  .strict();

export const IdleSliceSchema = z
  .object({
    mode: z.enum(['idle', 'decision']),
    last_simulated_tick: z.string().regex(/^-?\d+$/),
    total_idle_ticks: z.string().regex(/^-?\d+$/),
  })
  .strict();

export const LifeSliceSchema = z
  .object({
    turn: z.number().int().nonnegative(),
    resources: z.record(z.string(), z.number()),
    skills: z.record(z.string(), z.number()),
    residue: z.array(ResidueEventSchema),
  })
  .strict();

export const PracticeSliceSchema = z
  .object({
    id: z.string().min(1),
    currentProgress: z.number(),
    level: z.number().int().nonnegative(),
  })
  .strict();

export const MemberSliceSchema = z
  .object({
    life: LifeSliceSchema,
    practices: z.array(PracticeSliceSchema),
  })
  .strict();

export const WorldDraftReferenceSchema = z
  .object({
    scale: z.string().min(1),
  })
  .strict();

export const StudioSessionV0Schema = z
  .object({
    schema_version: z.literal(STUDIO_SESSION_V0_VERSION),
    studio: StudioStateV0Schema,
    idle: IdleSliceSchema,
    life: LifeSliceSchema,
    practices: z.array(PracticeSliceSchema),
    last_visited_at_unix: z.number().optional(),
  })
  .strict();

export type StudioSessionV0 = z.infer<typeof StudioSessionV0Schema>;

/**
 * Wrap the v0 single-bay session as the person bench of a v1 session.
 * The archive is hoisted to the top level and each card is migrated to
 * manifest/v1; a card that fails to parse fails the whole migration loudly.
 */
export function migrateStudioSessionV0(v0: StudioSessionV0): StudioSession {
  return {
    schema_version: 'studio_session/v1',
    benches: {
      person: {
        residue: v0.studio.residue,
        last_harvest_index: v0.studio.last_harvest_index,
        bay: v0.studio.bay,
        quality_tier: v0.studio.quality_tier,
        harvest_count: v0.studio.harvest_count,
        play_import: v0.studio.play_import ?? null,
        pinned: v0.studio.pinned ?? null,
        surplus: v0.studio.surplus ?? 0,
      },
    },
    // The re-parse is load-bearing: it widens readonly `Manifest.tags` to the
    // schema's inferred (mutable) type so this literal satisfies StudioSession.
    archive: v0.studio.archive.map((card) => ManifestSchema.parse(parseManifest(card))),
    tiers: { person: createTierState('person', true) },
    milestones_done: [],
    compendium_done: [],
    embodied_member: null,
    idle: v0.idle,
    life: v0.life,
    practices: v0.practices,
    members: {},
    world_drafts: [],
    ...(v0.last_visited_at_unix === undefined
      ? {}
      : { last_visited_at_unix: v0.last_visited_at_unix }),
  };
}
