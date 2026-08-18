// Progression content schemas — the data contract for the six-tier chain.
//
// Every row is versioned (`tier/v0`, `kind/v0`, …). Evolution is additive:
// new optional fields or new rows; renames get a new version plus a
// migration. Validated by ./loader; design-linted by ./lint.

import { z } from 'zod';

import { SCALE_VALUES } from '@/engine/manifest';

import { EffectOpSchema } from '../schema';

export const ScaleSchema = z.enum(SCALE_VALUES);
export type Scale = z.infer<typeof ScaleSchema>;

/* ---- kind/v0 ------------------------------------------------------------ */

const ResidueEventTypeSchema = z.enum([
  'practice_tick',
  'practice_level',
  'lens_chosen',
  'event_resolved',
  'resource_edge',
  'life_ended',
]);

export const KindMatchSchema = z
  .object({
    dominant: ResidueEventTypeSchema.optional(),
    no_dominant: z.literal(true).optional(),
    dominant_in: z.array(ResidueEventTypeSchema).min(1).optional(),
    social: z.literal(true).optional(),
    spatial: z.literal(true).optional(),
  })
  .strict()
  .refine((m) => Object.values(m).some((v) => v !== undefined), {
    message: 'kind match must specify at least one clause',
  });

export const KIND_ROW_VERSION = 'kind/v0' as const;

export const KindRowSchema = z
  .object({
    schema_version: z.literal(KIND_ROW_VERSION),
    id: z.string().min(1),
    scale: ScaleSchema,
    pinnable: z.boolean().default(false),
    catalog_ref: z.string().min(1),
    sid_ns: z.string().min(1),
    min_quality: z.number().int().min(0).default(0),
    match: KindMatchSchema,
  })
  .strict();
export type KindRow = z.infer<typeof KindRowSchema>;

/* ---- catalog/v0 ---------------------------------------------------------- */

// Plain strings by design: compiled card output (SPEC §7), NOT SIDs —
// the one content row where prose is allowed to live outside en.json.

export const CatalogEntrySchema = z
  .object({
    name: z.string().min(1),
    one_liner: z.string().min(1),
    subject: z.string().min(1),
    detail: z.string().min(1),
    tags: z.array(z.string().min(1)).min(1),
  })
  .strict();
export type CatalogEntryRow = z.infer<typeof CatalogEntrySchema>;

export const CatalogTableSchema = z
  .object({
    kind: z.string().min(1),
    entries: z.array(CatalogEntrySchema).min(1),
  })
  .strict();
export type CatalogTable = z.infer<typeof CatalogTableSchema>;

/** Visitor namespace name (table_ref) → an array of catalog entries.
 * The visitor table is the WHOLE pool: every kind picks from the same set
 * while the visit is seated (Phase 4 Task 2 binding decision 2). */
export const VisitorTableMapSchema = z.record(
  z.string().min(1),
  z.array(CatalogEntrySchema).min(1),
);
export type VisitorTableMap = z.infer<typeof VisitorTableMapSchema>;

/* ---- tier/v0 ------------------------------------------------------------ */

export const TIER_VERSION = 'tier/v0' as const;

export const TierSchema = z
  .object({
    schema_version: z.literal(TIER_VERSION),
    id: z.string().min(1),
    scale: ScaleSchema,
    index: z.number().int().min(0),
    roster_size: z
      .object({
        min: z.number().int().min(0),
        max: z.number().int().min(1),
      })
      .strict(),
    member_unit: z.string().min(1),
    role_table_ref: z.string().min(1),
    unlock_milestone: z.string().min(1).nullable(),
    fold_cadence: z.number().int().min(1),
    endowment_slots: z.number().int().min(0),
    visitor_table_ref: z.string().min(1),
  })
  .strict();
export type Tier = z.infer<typeof TierSchema>;

/* ---- archive predicates -------------------------------------------------- */

export interface ArchiveComparison {
  op: 'gte' | 'gt' | 'eq';
  key: string;
  value: number;
}
export interface ArchiveJunction {
  op: 'and' | 'or';
  operands: ArchivePredicate[];
}
export interface ArchiveNegation {
  op: 'not';
  operand: ArchivePredicate;
}
export type ArchivePredicate = ArchiveComparison | ArchiveJunction | ArchiveNegation;

export const ArchivePredicateSchema: z.ZodType<ArchivePredicate> = z.lazy(() =>
  z.union([ArchiveComparisonSchema, ArchiveJunctionSchema, ArchiveNegationSchema]),
);

const ArchiveComparisonSchema = z
  .object({
    op: z.enum(['gte', 'gt', 'eq']),
    key: z.string().min(1),
    value: z.number(),
  })
  .strict();
const ArchiveJunctionSchema = z
  .object({
    op: z.enum(['and', 'or']),
    operands: z.array(ArchivePredicateSchema).min(1),
  })
  .strict();
const ArchiveNegationSchema = z
  .object({
    op: z.literal('not'),
    operand: ArchivePredicateSchema,
  })
  .strict();

/* ---- milestone/v0 -------------------------------------------------------- */

export const MILESTONE_VERSION = 'milestone/v0' as const;

export const MilestoneSchema = z
  .object({
    schema_version: z.literal(MILESTONE_VERSION),
    id: z.string().min(1),
    predicate: ArchivePredicateSchema,
    grants: z
      .object({
        tier: z.string().min(1),
        ceremony_sid: z.string().min(1),
      })
      .strict(),
  })
  .strict();
export type Milestone = z.infer<typeof MilestoneSchema>;

/* ---- policy/v0 ------------------------------------------------------------ */

export const POLICY_VERSION = 'policy/v0' as const;

export const PolicySchema = z
  .object({
    schema_version: z.literal(POLICY_VERSION),
    id: z.string().min(1),
    practices: z.array(z.string().min(1)),
    schedule_ref: z.string().min(1),
    choice_weights: z.record(z.string(), z.number()),
  })
  .strict();
export type Policy = z.infer<typeof PolicySchema>;

/* ---- endowment/v0 ---------------------------------------------------------- */

export const ENDOWMENT_VERSION = 'endowment/v0' as const;

export const EndowmentTrackSchema = z
  .object({
    schema_version: z.literal(ENDOWMENT_VERSION),
    id: z.string().min(1),
    tier: z.string().min(1),
    requires: z.string().min(1).nullable(),
    slot_cost: z.number().int().min(1),
    effects: z.array(EffectOpSchema),
  })
  .strict();
export type EndowmentTrack = z.infer<typeof EndowmentTrackSchema>;

/* ---- visitor/v0 ------------------------------------------------------------- */

export const VISITOR_VERSION = 'visitor/v0' as const;

export const VisitorSchema = z
  .object({
    schema_version: z.literal(VISITOR_VERSION),
    id: z.string().min(1),
    tiers: z.array(ScaleSchema).min(1),
    cadence_ticks: z.number().int().min(1),
    jitter_ticks: z.number().int().min(0),
    duration_windows: z.number().int().min(1),
    effects: z.array(EffectOpSchema).optional(),
    table_ref: z.string().min(1).optional(),
    sid_ns: z.string().min(1),
  })
  .strict()
  .refine((v) => (v.effects === undefined) !== (v.table_ref === undefined), {
    message: 'visitor must set exactly one of effects or table_ref',
  });
export type Visitor = z.infer<typeof VisitorSchema>;

/* ---- compendium/v0 ----------------------------------------------------------- */

export const COMPENDIUM_VERSION = 'compendium/v0' as const;

export const CompendiumEntrySchema = z
  .object({
    schema_version: z.literal(COMPENDIUM_VERSION),
    id: z.string().min(1),
    predicate: ArchivePredicateSchema,
    reward: z
      .object({
        effects: z.array(EffectOpSchema).optional(),
        unlock: z.string().min(1).optional(),
      })
      .strict()
      .refine((r) => (r.effects === undefined) !== (r.unlock === undefined), {
        message: 'reward must set exactly one of effects or unlock',
      }),
    sid_ns: z.string().min(1),
  })
  .strict();
export type CompendiumEntry = z.infer<typeof CompendiumEntrySchema>;

/* ---- roles/v0 ----------------------------------------------------------- */

// Roles are compiled card output (plain strings, NOT SIDs): role labels and
// the names the bench fills them with. Each scale-level block is its own
// keyed table so future scales append without touching this schema.
// `policy` is the seated policy graduation stamps on member rows — REQUIRED
// by the engine for member-bearing tiers (org), unused by unit tiers (town).

const RolesBlockSchema = z
  .object({
    roles: z.array(z.string().min(1)).min(1),
    names: z.array(z.string().min(1)).min(1),
    policy: z.string().min(1).optional(),
  })
  .strict();

export const RolesFileSchema = z
  .object({
    household: RolesBlockSchema,
    org: RolesBlockSchema.optional(),
    town: RolesBlockSchema.optional(),
    city: RolesBlockSchema.optional(),
    region: RolesBlockSchema.optional(),
  })
  .strict();
export type RolesFile = z.infer<typeof RolesFileSchema>;
