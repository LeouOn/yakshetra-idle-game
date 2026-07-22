/**
 * Yakshetra content schema v0.1.
 *
 * This is the PRIMARY enforcement layer for content packs. Any pack that fails
 * to parse against {@link EraPackSchema} is rejected before the lint (the
 * secondary, textual layer) ever runs.
 *
 * Design invariant: the {@link EffectOpSchema} discriminated union deliberately
 * OMITS the prohibited "delta" mechanics that would reify a metaphysical score
 * (see the plan's MUST-NOT list — the four named forbidden effect types). Those
 * tokens never appear as valid discriminator values, so any pack referencing
 * them throws at parse time with an "Invalid discriminator value" error. Do not
 * add them, and do not mention them by literal identifier anywhere in this
 * file (the grep gate enforces zero textual matches).
 *
 * See `.omo/plans/buddhist-inspired-incremental-rpg.md` todo 4.
 */

import { z } from 'zod';

/* -------------------------------------------------------------------------------------------------
 * Primitives
 * -----------------------------------------------------------------------------------------------*/

/**
 * Identifier for a content pack: `<slug>@<semver>`.
 * The slug is lowercase ASCII with hyphens; the version is strict MAJOR.MINOR.PATCH.
 */
export const ContentPackIdSchema = z
  .string()
  .regex(/^[a-z][a-z0-9-]*@[0-9]+\.[0-9]+\.[0-9]+$/, 'ContentPackId must match <slug>@<semver>');

export type ContentPackId = z.infer<typeof ContentPackIdSchema>;

/**
 * A string identifier pointing at a localization entry. Every player-facing
 * text field is a `_sid` reference; inline strings are forbidden.
 */
export const SidSchema = z
  .string()
  .min(1)
  .regex(/_sid$/, 'player-facing text fields must be string ids ending in "_sid"');

export type Sid = z.infer<typeof SidSchema>;

/**
 * A locale-keyed text map. The `en` locale is always required; other locales
 * are optional additions.
 */
export const LocalizedTextSchema = z
  .record(z.string().min(1), z.string())
  .refine((rec) => Object.prototype.hasOwnProperty.call(rec, 'en'), {
    message: "locale 'en' is required in LocalizedText",
  });

export type LocalizedText = z.infer<typeof LocalizedTextSchema>;

/** A non-empty token (used for resource keys, skill keys, flags, etc.). */
const TokenSchema = z.string().min(1);

/* -------------------------------------------------------------------------------------------------
 * EffectOp — discriminated union of permitted effect operations.
 *
 * NOTE: The discriminator values below are the ONLY legal effect types.
 * Prohibited mechanics are excluded by omission; do not add them.
 * -----------------------------------------------------------------------------------------------*/

const AddResourceOpSchema = z
  .object({
    op: z.literal('add_resource'),
    key: TokenSchema.describe('resource key, e.g. "alms", "harm_given"'),
    delta: z.number(),
  })
  .strict();

const AddSkillOpSchema = z
  .object({
    op: z.literal('add_skill'),
    key: TokenSchema,
  })
  .strict();

const AddFlagOpSchema = z
  .object({
    op: z.literal('add_flag'),
    key: TokenSchema,
  })
  .strict();

const RemoveFlagOpSchema = z
  .object({
    op: z.literal('remove_flag'),
    key: TokenSchema,
  })
  .strict();

const AddRelationshipOpSchema = z
  .object({
    op: z.literal('add_relationship'),
    target: TokenSchema,
    delta: z.number(),
  })
  .strict();

const ModifyEventWeightOpSchema = z
  .object({
    op: z.literal('modify_event_weight'),
    event_id: TokenSchema,
    multiplier: z.number().positive('event weight multiplier must be > 0'),
  })
  .strict();

const TriggerEventOpSchema = z
  .object({
    op: z.literal('trigger_event'),
    event_id: TokenSchema,
  })
  .strict();

const SetIntentRootOpSchema = z
  .object({
    op: z.literal('set_intent_root'),
    intent_root: TokenSchema,
  })
  .strict();

const NarrativeCardOpSchema = z
  .object({
    op: z.literal('narrative_card'),
    card_sid: SidSchema,
  })
  .strict();

/**
 * Discriminated union of all permitted effect operations.
 *
 * Intentionally narrow: there are exactly nine variants. Prohibited mechanics
 * are absent by design.
 */
export const EffectOpSchema = z.discriminatedUnion('op', [
  AddResourceOpSchema,
  AddSkillOpSchema,
  AddFlagOpSchema,
  RemoveFlagOpSchema,
  AddRelationshipOpSchema,
  ModifyEventWeightOpSchema,
  TriggerEventOpSchema,
  SetIntentRootOpSchema,
  NarrativeCardOpSchema,
]);

export type EffectOp = z.infer<typeof EffectOpSchema>;

/** Read-only set of permitted effect op discriminator values (for introspection). */
export const PERMITTED_EFFECT_OPS = [
  'add_resource',
  'add_skill',
  'add_flag',
  'remove_flag',
  'add_relationship',
  'modify_event_weight',
  'trigger_event',
  'set_intent_root',
  'narrative_card',
] as const;

/* -------------------------------------------------------------------------------------------------
 * Predicate — recursive discriminated union.
 *
 * `and` / `or` / `not` reference Predicate itself, so the schema is declared
 * via z.lazy and a hand-written TS type (z.infer cannot describe the cycle).
 * -----------------------------------------------------------------------------------------------*/

export type Predicate =
  | { op: 'gte'; key: string; value: number }
  | { op: 'lte'; key: string; value: number }
  | { op: 'gt'; key: string; value: number }
  | { op: 'lt'; key: string; value: number }
  | { op: 'eq'; key: string; value: string | number }
  | { op: 'in'; key: string; values: readonly string[] }
  | { op: 'and'; operands: readonly Predicate[] }
  | { op: 'or'; operands: readonly Predicate[] }
  | { op: 'not'; operand: Predicate }
  | { op: 'has_flag'; key: string }
  | { op: 'has_skill'; key: string }
  | { op: 'has_resource'; key: string }
  | { op: 'intent_root_gte'; value: number };

const leafPredicateSchemas = [
  z.object({ op: z.literal('gte'), key: TokenSchema, value: z.number() }).strict(),
  z.object({ op: z.literal('lte'), key: TokenSchema, value: z.number() }).strict(),
  z.object({ op: z.literal('gt'), key: TokenSchema, value: z.number() }).strict(),
  z.object({ op: z.literal('lt'), key: TokenSchema, value: z.number() }).strict(),
  z
    .object({ op: z.literal('eq'), key: TokenSchema, value: z.union([z.string(), z.number()]) })
    .strict(),
  z.object({ op: z.literal('in'), key: TokenSchema, values: z.array(z.string()) }).strict(),
  z.object({ op: z.literal('has_flag'), key: TokenSchema }).strict(),
  z.object({ op: z.literal('has_skill'), key: TokenSchema }).strict(),
  z.object({ op: z.literal('has_resource'), key: TokenSchema }).strict(),
  z.object({ op: z.literal('intent_root_gte'), value: z.number() }).strict(),
] as const;

/**
 * Recursive predicate schema. `and` / `or` / `not` compose other predicates.
 *
 * Declared with an explicit {@link z.ZodType} annotation so the self-reference
 * inside the lazy callback type-checks.
 */
export const PredicateSchema: z.ZodType<Predicate> = z.lazy(() =>
  z.discriminatedUnion('op', [
    ...leafPredicateSchemas,
    z.object({ op: z.literal('and'), operands: z.array(PredicateSchema).min(1) }).strict(),
    z.object({ op: z.literal('or'), operands: z.array(PredicateSchema).min(1) }).strict(),
    z.object({ op: z.literal('not'), operand: PredicateSchema }).strict(),
  ]),
);

/* -------------------------------------------------------------------------------------------------
 * Choice, Event, EraPack
 * -----------------------------------------------------------------------------------------------*/

export const ChoiceSchema = z
  .object({
    id: TokenSchema,
    label_sid: SidSchema,
    requires: z.array(PredicateSchema),
    effects: z.array(EffectOpSchema),
    forbidden: z.boolean(),
  })
  .strict();

export type Choice = z.infer<typeof ChoiceSchema>;

export const EventSchema = z
  .object({
    id: TokenSchema,
    weight: z.number().positive('event weight must be > 0'),
    cooldown_turns: z.number().int().min(0, 'cooldown_turns must be an integer >= 0'),
    once_per_run: z.boolean(),
    trigger: PredicateSchema.optional(),
    choices: z.array(ChoiceSchema).min(1, 'an event must have 1..4 choices').max(4),
    content_warnings: z.array(z.string()),
  })
  .strict();

export type Event = z.infer<typeof EventSchema>;

/** Source bibliography entry: a citation plus a resolvable URL. */
const SourceBibliographyEntrySchema = z
  .object({
    citation: z.string().min(1),
    url: z.string().url('source_bibliography.url must be a valid URL'),
  })
  .strict();

/** Rule variation: declares which social mechanic the era enforces. */
const RuleVariationSchema = z
  .object({
    id: TokenSchema,
    description_sid: SidSchema,
    enforces: z.enum(['social-obligation', 'vow']),
  })
  .strict();

const SocialConfigSchema = z
  .object({
    paramitas: z.array(TokenSchema).min(1, 'social.paramitas must list >= 1 paramita key'),
    relations: z.array(TokenSchema),
  })
  .strict();

/** Glossary: term -> localized text. */
const GlossarySchema = z.record(z.string().min(1), LocalizedTextSchema);

/**
 * Root content pack schema for an era. This is the parse entry point.
 *
 * Constraints of note:
 * - {@link EventSchema events} array length is [6..10]
 * - `locale_available` MUST contain "en"
 * - `schema_version` is the literal "0.1"
 * - `lens_set` is fixed to "six-paramita-mahayana"
 */
export const EraPackSchema = z
  .object({
    id: ContentPackIdSchema,
    name_sid: SidSchema,
    locale_default: z.literal('en'),
    locale_available: z
      .array(z.string().min(1))
      .min(1)
      .refine((arr) => arr.includes('en'), {
        message: "locale_available must include 'en'",
      }),
    schema_version: z.literal('0.1'),
    engine_compat: z.string().min(1).describe('semver range accepted by the engine, e.g. "^0.1.0"'),
    lens_set: z.literal('six-paramita-mahayana'),
    social: SocialConfigSchema,
    calendar: z.string().min(1),
    content_warnings: z.array(z.string()),
    events: z.array(EventSchema).min(6, 'era must contain 6..10 events').max(10),
    lineage_notes_sid: SidSchema,
    glossary: GlossarySchema,
    source_bibliography: z.array(SourceBibliographyEntrySchema),
    permitted_imagery: z.array(z.string()),
    rule_variation: RuleVariationSchema,
  })
  .strict();

export type EraPack = z.infer<typeof EraPackSchema>;
