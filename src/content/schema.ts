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
 * text field is a `_sid` reference or an opaque `s:` content identifier.
 * Inline strings are forbidden.
 */
export const SidSchema = z
  .string()
  .min(1)
  .regex(/^(?:s:[a-z0-9][a-z0-9._:-]*|.+_sid)$/, 'player-facing text fields must be string ids');

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
export const TokenSchema = z.string().min(1);

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

const SetScheduleOpSchema = z
  .object({
    op: z.literal('set_schedule'),
    schedule_id: TokenSchema,
  })
  .strict();

const SetPracticeOverrideOpSchema = z
  .object({
    op: z.literal('set_practice_override'),
    practice_id: TokenSchema.nullable(),
  })
  .strict();

/**
 * Discriminated union of all permitted effect operations.
 *
 * Intentionally narrow: there are exactly eleven variants. Prohibited mechanics
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
  SetScheduleOpSchema,
  SetPracticeOverrideOpSchema,
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
  'set_schedule',
  'set_practice_override',
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
 * Role — a playable starting station within an era.
 *
 * Introduced by todo 12 (life-start screen). Roles are OPTIONAL on an
 * EraPack so existing fixtures and the schema/lint tests from todos 4-5 do not
 * break: the field is `.optional()`, and Wave 4-5 authored packs (Tang China,
 * Fantasy) will populate it. When absent the UI falls back to placeholder roles.
 * A future todo may flip this to required once the first real pack ships.
 * -----------------------------------------------------------------------------------------------*/

/** Resource-key -> starting value map for a role (e.g. { alms: 2, trust: 1 }). */
export const StartingResourcesSchema = z.record(z.string().min(1), z.number());

export type StartingResources = z.infer<typeof StartingResourcesSchema>;

export const RoleSchema = z
  .object({
    id: TokenSchema.describe('role id, e.g. "peasant", "merchant", "monastic"'),
    label_sid: SidSchema.optional(),
    title_sid: SidSchema.optional(),
    description_sid: SidSchema,
    starting_resources: StartingResourcesSchema,
  })
  .strict()
  .refine((role) => (role.label_sid === undefined) !== (role.title_sid === undefined), {
    message: 'a role must define exactly one of label_sid or title_sid',
  });

export type Role = z.infer<typeof RoleSchema>;

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
    minigame_id: TokenSchema.nullable().optional(),
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

const LegacySocialConfigSchema = z
  .object({
    paramitas: z.array(TokenSchema).min(1, 'social.paramitas must list >= 1 paramita key'),
    relations: z.array(TokenSchema),
  })
  .strict();

const AuthoredSocialConfigSchema = z
  .object({
    name: z.string().min(1),
    strata: z.array(TokenSchema).min(1),
    default_role_at_birth: TokenSchema,
    mobility_rules_sid: SidSchema,
  })
  .strict();

const SocialConfigSchema = z.union([LegacySocialConfigSchema, AuthoredSocialConfigSchema]);

const GlossarySchema = z.record(z.string().min(1), z.union([LocalizedTextSchema, SidSchema]));

/**
 * Root content pack schema for an era. This is the parse entry point.
 *
 * Constraints of note:
 * - `events` is OPTIONAL on the wire so a Wave 4-5 authored pack can ship the
 *   scaffold (pack.json5) before Wave 4-5 events land as a separate file
 *   consumed at integration time. Schema and loader default it to `[]`. The
 *   invariant for shipping is enforced at integration, not parse.
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
    events: z
      .array(EventSchema)
      .min(6, 'era must contain 6..10 events')
      .max(10)
      .optional()
      .default([]),
    starting_roles: z.array(RoleSchema).min(1).optional(),
    lineage_notes_sid: SidSchema,
    glossary: GlossarySchema,
    source_bibliography: z.array(SourceBibliographyEntrySchema),
    permitted_imagery: z.array(z.string()),
    rule_variation: RuleVariationSchema,
  })
  .strict();

export type EraPack = z.infer<typeof EraPackSchema>;

/* -------------------------------------------------------------------------------------------------
 * Ending — a scripted death/transition for a life.
 *
 * Endings live in a per-pack `endings.json5` sibling to `events.json5`. The
 * loader reads only `pack.json5`; endings are validated standalone (the same
 * pattern events use) and merged at integration time.
 *
 * Each ending carries a `trigger` predicate evaluated against the run state,
 * a `narrative_sid` resolving to weighted-not-graphic prose, and
 * `echo_implications` describing which cross-life echo fields the ending tends
 * to produce (descriptive metadata for the echo reducer, not a score).
 *
 * See `.omo/plans/buddhist-inspired-incremental-rpg.md` todo 18.
 * -----------------------------------------------------------------------------------------------*/

/**
 * Descriptive metadata linking an ending to the cross-life echo categories it
 * tends to produce. Every field is optional; an ending may produce zero or
 * more echo types. Values are short human-readable descriptions (not
 * machine-evaluated predicates) consumed by the echo reducer at integration.
 */
const EchoImplicationsSchema = z
  .object({
    tendency: z
      .string()
      .min(1)
      .optional()
      .describe('tendency echo this ending solidifies (top intent_root)'),
    attachment: z
      .string()
      .min(1)
      .optional()
      .describe('unresolved-attachment echo this ending produces'),
    pattern_break: z
      .string()
      .min(1)
      .optional()
      .describe('pattern-break echo this ending makes more likely'),
    broken_vow: z
      .string()
      .min(1)
      .optional()
      .describe('broken-vow echo if vows existed and were interrupted'),
  })
  .strict();

export const EndingSchema = z
  .object({
    id: TokenSchema.describe('ending id, e.g. "ending:tang/old-age"'),
    trigger: PredicateSchema.describe('predicate on run state that selects this ending'),
    narrative_sid: SidSchema.describe('weighted-not-graphic death narrative'),
    echo_implications: EchoImplicationsSchema.describe(
      'which cross-life echo fields this ending tends to produce',
    ),
  })
  .strict();

export type Ending = z.infer<typeof EndingSchema>;

/* -------------------------------------------------------------------------------------------------
 * Sutra, Mantra, BuddhistFigure — sacred-text content types.
 *
 * These three types form the structural foundation for surfacing
 * tradition-inspired text and figure references inside an era. The schemas
 * only describe SHAPE — what fields exist and what enum values each accepts.
 * They do NOT legislate tradition-specific content. Named figures and
 * mantras are allowed; see SPEC.md. The remaining lint is game-design only
 * (no karma meter, no pay-to-absolve).
 *
 * Invariants carried by shape:
 *   - Every player-facing string is a `_sid` reference; inline strings are
 *     rejected by {@link SidSchema}.
 *   - Cross references use opaque {@link TokenSchema} ids
 *     (`source_sutra_id`, `associated_figure_id`, `mantra_id`). Display
 *     names live in the localization bundle.
 *   - Enums close the world: school, lens, role, language. Adding a new value
 *     is a schema change, not an authoring choice.
 * -----------------------------------------------------------------------------------------------*/

const SUTRA_SCHOOL_VALUES = [
  'prajnaparamita',
  'pure-land',
  'chan',
  'tiantai',
  'huayan',
  'vinaya',
  'miscellaneous-mahayana',
] as const;

const LANGUAGE_OF_ORIGIN_VALUES = ['sanskrit', 'chinese-indigenous', 'unknown'] as const;

const MANTRA_LENS_VALUES = ['collected_attention', 'discernment'] as const;

const FIGURE_ROLE_VALUES = [
  'historical-buddha',
  'pure-land-buddha',
  'cosmic-buddha',
  'bodhisattva',
  'historical-teacher',
  'arhat',
] as const;

/**
 * A canonical sutra text within an era. Titles, translators, and prose are all
 * `_sid` references; the schema never carries inline text. `school` and
 * `language_of_origin` are closed enums so a pack cannot introduce a new
 * tradition without a schema change.
 */
export const SutraSchema = z
  .object({
    id: TokenSchema,
    title_sid: SidSchema,
    transliterated_title_sid: SidSchema,
    translator_sid: SidSchema,
    translation_era_sid: SidSchema,
    description_sid: SidSchema,
    excerpt_sid: SidSchema,
    attribution_note_sid: SidSchema,
    school: z.enum(SUTRA_SCHOOL_VALUES),
    language_of_origin: z.enum(LANGUAGE_OF_ORIGIN_VALUES),
  })
  .strict();

export type Sutra = z.infer<typeof SutraSchema>;

/**
 * A short recitative phrase tied to a practice lens. The `associated_figure_id`
 * and `source_sutra_id` are optional cross-references into the era's
 * {@link BuddhistFigure} and {@link Sutra} collections (null when none).
 */
export const MantraSchema = z
  .object({
    id: TokenSchema,
    label_sid: SidSchema,
    transliteration_sid: SidSchema,
    translation_sid: SidSchema,
    associated_figure_id: TokenSchema.nullable(),
    practice_lens: z.enum(MANTRA_LENS_VALUES),
    description_sid: SidSchema,
    source_sutra_id: TokenSchema.nullable(),
  })
  .strict();

export type Mantra = z.infer<typeof MantraSchema>;

/**
 * A tradition-inspired figure reference (Buddha, bodhisattva, teacher, arhat).
 * Display name resolvable via `display_name_sid`; the `transliterated_names`
 * array is a non-empty list of opaque tokens the lint scans against the
 * prohibited-names closed list (`advisory/prohibited-names.txt`). Cross-links
 * to {@link Mantra} and {@link Sutra} collections use opaque ids.
 */
export const BuddhistFigureSchema = z
  .object({
    id: TokenSchema,
    display_name_sid: SidSchema,
    transliterated_names: z.array(TokenSchema).min(1),
    role: z.enum(FIGURE_ROLE_VALUES),
    primary_attribute_sid: SidSchema,
    mantra_id: TokenSchema.nullable(),
    sutra_ids: z.array(TokenSchema),
    iconography_sid: SidSchema,
    reverence_note_sid: SidSchema,
  })
  .strict();

export type BuddhistFigure = z.infer<typeof BuddhistFigureSchema>;

/* -------------------------------------------------------------------------------------------------
 * Practice, ScheduleBlock, DailySchedule — idle-mode authored content.
 *
 * These describe the content packs' daily-rhythm data: a Practice is an
 * authored activity that progresses over idle ticks (the engine's runtime
 * Practice type in `./engine/types.ts` adds mutable progress/level state on
 * top of this authored shape); a DailySchedule is a sequence of named
 * ScheduleBlocks covering a full day.
 * -----------------------------------------------------------------------------------------------*/

/**
 * The six parami-inspired lenses a Practice may belong to. Mirrors the
 * {@link Lens} string-literal union in the engine without introducing a
 * runtime dependency on the engine package.
 */
const PRACTICE_LENS_VALUES = [
  'generosity',
  'careful_conduct',
  'patient_courage',
  'joyful_effort',
  'collected_attention',
  'discernment',
] as const;

/** A practice is an activity that progresses over time. */
export const PracticeSchema = z
  .object({
    id: TokenSchema,
    label_sid: SidSchema,
    description_sid: SidSchema,
    lens: z.enum(PRACTICE_LENS_VALUES),
    progressPerTick: z.number().positive(),
    maxProgress: z.number().positive(),
    effects: z.array(EffectOpSchema),
    minigame_id: TokenSchema.nullable().optional(),
  })
  .strict();

export type Practice = z.infer<typeof PracticeSchema>;

/** A named period within a day. */
export const ScheduleBlockSchema = z
  .object({
    id: TokenSchema,
    label_sid: SidSchema,
    startHour: z.number().int().min(0).max(23),
    endHour: z.number().int().min(1).max(24),
    practice_id: TokenSchema.nullable(),
    minigame_id: TokenSchema.nullable().optional(),
    icon_sid: SidSchema,
  })
  .strict();

export type ScheduleBlock = z.infer<typeof ScheduleBlockSchema>;

/** A full day's schedule. */
export const DailyScheduleSchema = z
  .object({
    id: TokenSchema,
    name_sid: SidSchema,
    blocks: z.array(ScheduleBlockSchema).min(1),
  })
  .strict();

export type DailySchedule = z.infer<typeof DailyScheduleSchema>;
