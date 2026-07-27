// Core type definitions for the deterministic engine.
//
// These stub interfaces are scaffolded in todo 2 and fleshed out by:
//   - todo 6: LifeState + within-life reducer types (ResourceId/Lens/IntentRoot/
//     LifeId/EraId/RoleId/SocialIdentity/LifeState)
//   - todo 7: KarmaState + cross-life echo types (EchoType/Echo/KarmaState/
//     NextLifeSeed)
//   - todo 10: SaveBlob
//
// Choice/Event/EffectOp/Predicate canonical Zod shapes live in
// `src/content/schema.ts` (todo 4); the minimal forward declaration of `Choice`
// here lets the engine compile standalone without depending on the content package.

import type { Choice, EffectOp, Ending, Event, Predicate } from '@/content/schema';

import type { CalendarComponents } from './calendar';

// ---------------------------------------------------------------------------
// Deterministic RNG (implemented in todo 3 — ./rng-impl.ts + ./rng.ts)
// ---------------------------------------------------------------------------

/**
 * Deterministic random source. All methods consume the seeded xoshiro128**
 * stream only; the engine never draws from an unseeded global RNG.
 */
export interface Rng {
  /** Uniform float in [0, 1). */
  next(): number;
  /**
   * Uniform integer in [minInclusive, maxExclusive). Uses rejection sampling
   * so there is no modulo bias when the range is not a power of two.
   */
  nextInt(minInclusive: number, maxExclusive: number): number;
  /**
   * Pick one element from a non-empty array using the seeded stream.
   * @throws {RangeError} when `arr` is empty.
   */
  pick<T>(arr: readonly T[]): T;
  /** Return a NEW shuffled array; the input is never mutated. */
  shuffle<T>(arr: readonly T[]): T[];
}

// ---------------------------------------------------------------------------
// Branded primitives (todo 6)
// ---------------------------------------------------------------------------

/** Branded string identifying a single life within a chain. */
export type LifeId = string & { readonly __brand: 'LifeId' };

/** Branded string identifying an era pack. */
export type EraId = string & { readonly __brand: 'EraId' };

/** Branded string identifying a role within an era. */
export type RoleId = string & { readonly __brand: 'RoleId' };

// ---------------------------------------------------------------------------
// String-literal union "enums"
// ---------------------------------------------------------------------------

/** The six tunable resources. Fixed set per plan todo 6. */
export type ResourceId = 'time' | 'energy' | 'provisions' | 'trust' | 'skill' | 'obligation';

/** The six parami-inspired lenses the player may focus through. */
export type Lens =
  | 'generosity'
  | 'careful_conduct'
  | 'patient_courage'
  | 'joyful_effort'
  | 'collected_attention'
  | 'discernment';

/** The four root intentions an action may spring from. */
export type IntentRoot = 'care' | 'greed' | 'aversion' | 'delusion';

/** The four kinds of cross-life echo. */
export type EchoType = 'tendency' | 'vow' | 'unresolved_attachment' | 'pattern_break';

// ---------------------------------------------------------------------------
// Social identity (opaque, NEVER numerically scored — plan todo 6/7 Must NOT)
// ---------------------------------------------------------------------------

/**
 * Identity attributes of a life. All fields are opaque descriptive strings.
 * They are NEVER aggregated into a score and NEVER carried into the next life
 * by the echo reducer (enforced structurally + by assertion in todo 7).
 */
export interface SocialIdentity {
  readonly gender: string;
  readonly social_class: string;
  readonly family_wealth_at_birth: string;
  readonly caste_status: string;
  readonly disability_status: string;
}

// ---------------------------------------------------------------------------
// Within-life state (filled in todo 6)
// ---------------------------------------------------------------------------

/**
 * Within-life state.
 *
 * `resources` is keyed by string: the six {@link ResourceId} canonical keys are
 * always present (initialized by `createLifeState`), but content packs may
 * reference additional resource tokens through `add_resource` effects. Every
 * resource value is clamped at 0 by the reducer.
 *
 * `identity` is the FENCE: set once at life-start by `createLifeState` and
 * NEVER mutated by the reducer (todo 7/8 invariant). The cross-life echo
 * reducer never reads or writes it.
 */
export interface LifeState {
  /** Opaque social identity — immutable after life-start (the fence). */
  readonly identity: SocialIdentity;
  id: LifeId;
  era: EraId;
  role: RoleId;
  age: number;
  turn: number;
  /** Resource counters; always includes the six {@link ResourceId} keys. */
  resources: Record<string, number>;
  skills: Record<string, number>;
  relationships: Record<string, { trust: number; debt: number; affection: number }>;
  flags: Set<string>;
  intent_root_history: IntentRoot[];
  chosen_lens: Lens | null;
  alive: boolean;
  /** SID of the last narrative card shown to the player (null until first shown). */
  last_narrative_sid: string | null;
  /** Per-event weight overrides layered on top of each event's baseline weight. */
  event_weights: Record<string, number>;
  /** Remaining cooldown turns per event id (decremented each turn by advanceTurn). */
  cooldowns: Record<string, number>;
  /** Ordered ids of resolved choices/events (the deterministic replay log). */
  history: string[];
  /** Event ids that have fired and are marked once_per_run (never fire again). */
  fired_once_per_run: Set<string>;
  /** Event ids queued by `trigger_event` effects, awaiting the turn loop. */
  pending_events: string[];
  /** Active daily schedule id (null until a `set_schedule` effect fires). */
  readonly schedule_id: string | null;
  /** Active practice override id, or null to clear the override. */
  readonly practice_override_id: string | null;
  /**
   * Wall-clock unix seconds of the player's last visit. Set by the offline
   * catch-up layer (`./offline.ts`) when computing what happened while away;
   * absent on a freshly created life (defaults to 0). Never read from the
   * system clock inside the engine — the caller passes `nowUnix` in.
   */
  lastVisitedAtUnix?: number;
}

/**
 * Era-specific life-stage hook. The engine stays era-agnostic: age advancement
 * and any era-specific tick side effects are delegated to this callback so no
 * era knowledge leaks into the pure reducer. `advanceTurn` invokes it AFTER the
 * fixed engine ticks; the returned partial is shallow-merged (with `resources`
 * deep-merged) into the new state.
 */
export interface EraRules {
  advancePerTurn(state: LifeState, rng: Rng): Partial<LifeState>;
}

// ---------------------------------------------------------------------------
// Cross-life karma (filled in todo 7)
// ---------------------------------------------------------------------------

export interface Echo {
  type: EchoType;
  key: string;
  /** Weight in the closed interval [-1, 1]. */
  weight: number;
  source_life_id: LifeId;
  narrative_sid: string;
}

export interface KarmaState {
  echoes: Echo[];
  accumulated_intent_roots: Record<IntentRoot, number>;
  vows: Record<string, 'kept' | 'broken' | 'declared'>;
}

/**
 * Seed for the next life derived from accumulated karma.
 *
 * CRITICAL INVARIANT (plan todo 7): this shape MUST NOT contain any
 * `social_identity` field. The echo reducer can never set the next life's
 * class, caste, gender, wealth, or disability.
 */
export interface NextLifeSeed {
  starting_resources_modifier: Partial<Record<ResourceId, number>>;
  blocked_roles: RoleId[];
  narrative_seed_events: string[];
  forbidden_lens: Lens[];
  permitted_imagery_tag: string;
}

// ---------------------------------------------------------------------------
// Save blob (filled in todo 10)
// ---------------------------------------------------------------------------

export interface SaveBlob {
  schema_version: '0.1';
  engine_compat: string;
  /** Local clock only — advisory metadata, never used for game logic. */
  created_at_unix: number;
  run_id: string;
  chain: {
    life_states: LifeState[];
    karma_state: KarmaState;
    current_life_index: number;
  };
}

// ---------------------------------------------------------------------------
// Offline progress summary (consumed by ./offline.ts; referenced by SaveBlobV2)
// ---------------------------------------------------------------------------
//
// Produced by the offline catch-up layer when the player closes the app and
// reopens it later. Stored on the v0.2 blob as `pending_offline_summary` so
// the UI can surface "while you were away, X happened" exactly once, then
// clear it. Null when there is nothing to report.

/**
 * Summary of what happened while the player was away. Produced by the offline
 * catch-up layer (`./offline.ts`) from an {@link IdleTickResult} plus the
 * calendar snapshots bracketing the simulated span. Pure: no wall-clock or
 * global-RNG reads — `nowUnix` and `rngSeed` are passed in by the caller.
 *
 * Field naming matches the source {@link IdleTickResult}; the SaveBlob v0.2
 * envelope (see {@link SaveBlobV2}) uses snake_case for its own fields.
 */
export interface OfflineSummary {
  readonly idleTicksSimulated: bigint;
  readonly resourcesGained: Partial<Record<ResourceId, number>>;
  readonly practicesAdvanced: readonly {
    readonly id: string;
    readonly progressGained: number;
    readonly leveledUp: boolean;
  }[];
  readonly eventsTriggered: readonly string[];
  readonly endingTriggered: string | null;
  readonly calendarBefore: CalendarComponents;
  readonly calendarAfter: CalendarComponents;
}

// ---------------------------------------------------------------------------
// SaveBlob version 0.2 — idle mode (migration target)
// ---------------------------------------------------------------------------

/**
 * SaveBlob version 0.2 — adds idle mode fields.
 *
 * Produced by migrating a 0.1 blob via {@link ./migration.ts migrateSaveBlob}
 * or by the engine itself once idle mode has begun ticking. The three new
 * fields are pure metadata for the idle system; the existing `chain` shape is
 * unchanged so the within-life reducer and echo reducer keep reading it as
 * before.
 */
export interface SaveBlobV2 {
  readonly schema_version: '0.2';
  readonly engine_compat: string;
  readonly created_at_unix: number;
  /** When the player last played. Defaults to created_at_unix on migration. */
  readonly last_visited_at_unix: number;
  /**
   * Last absolute tick we simulated up to. Defaults to `0n` on migration; the
   * idle system populates this on the first idle tick.
   */
  readonly last_simulated_tick: bigint;
  readonly run_id: string;
  readonly chain: {
    life_states: LifeState[];
    karma_state: KarmaState;
    current_life_index: number;
  };
  /** Summary to show on return; null until the idle system computes one. */
  readonly pending_offline_summary: OfflineSummary | null;
}

/**
 * Any supported save blob, regardless of schema version. The migration layer
 * accepts this union and resolves it to the current {@link SaveBlobV2}.
 */
export type AnySaveBlob = SaveBlob | SaveBlobV2;

// ---------------------------------------------------------------------------
// Idle-mode types (idle tick reducer)
// ---------------------------------------------------------------------------
//
// The engine alternates between two modes: idle (time passes, the daily
// schedule drives practice) and decision (the player picks a choice). Idle
// state is tracked separately from LifeState so the within-life reducer stays
// focused on choice/event application.

/** The engine can be in idle mode (time passing) or decision mode (player chooses). */
export type EngineMode = 'idle' | 'decision';

/** State specific to idle mode. */
export interface IdleState {
  readonly mode: EngineMode;
  /** The last absolute tick we simulated up to (0 at life start). */
  readonly lastSimulatedTick: bigint;
  /** Cumulative idle ticks simulated across this life. */
  readonly totalIdleTicks: bigint;
}

/**
 * A practice is a recurring activity that progresses over idle time. Practices
 * are content data: the engine never mutates them; {@link IdleTickResult}
 * reports the deltas so the caller can construct new Practice values.
 */
export interface Practice {
  readonly id: string;
  readonly label_sid: string;
  readonly description_sid: string;
  /** Which parami lens this practice belongs to. */
  readonly lens: Lens;
  /** Progress added per simulated tick (may be fractional). */
  readonly progressPerTick: number;
  /** Progress required to advance one level. */
  readonly maxProgress: number;
  /** Progress accumulated so far. */
  readonly currentProgress: number;
  /** Current practice level. */
  readonly level: number;
  /** Effects folded into state on each tick while this practice is active. */
  readonly effects: readonly EffectOp[];
}

/** Result of simulating a batch of idle ticks. */
export interface IdleTickResult {
  readonly ticksSimulated: bigint;
  /** Cumulative resource deltas produced by practice effects (raw, pre-clamp). */
  readonly resourcesGained: Partial<Record<ResourceId, number>>;
  readonly practicesAdvanced: readonly {
    readonly id: string;
    readonly progressGained: number;
    readonly leveledUp: boolean;
  }[];
  /** Event ids fired by `trigger_event` effects during simulation. */
  readonly eventsTriggered: readonly string[];
  /** Ending id if a life-ending trigger matched (halts simulation). */
  readonly endingTriggered: string | null;
}

// ---------------------------------------------------------------------------
// Content-schema shapes (canonical Zod types, re-exported type-only from todo 4)
// ---------------------------------------------------------------------------
//
// The engine consumes the SAME Choice/Event/EffectOp/Predicate types that
// content packs are validated against (src/content/schema.ts). These are
// type-only imports, so the engine package keeps its runtime-purity fence
// (zod is already a declared engine dependency; nothing from react/rn/expo or
// the wall clock / global rng leaks in).

export type { Choice, EffectOp, Ending, Event, Predicate };
