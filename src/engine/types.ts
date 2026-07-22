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

export interface LifeState {
  id: LifeId;
  era: EraId;
  role: RoleId;
  age: number;
  turn: number;
  resources: Record<ResourceId, number>;
  skills: Record<string, number>;
  relationships: Record<string, { trust: number; debt: number; affection: number }>;
  flags: Set<string>;
  intent_root_history: IntentRoot[];
  chosen_lens: Lens | null;
  alive: boolean;
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
// Forward declaration: content-schema shapes (canonical in todo 4)
// ---------------------------------------------------------------------------

/**
 * Minimal `Choice` shape consumed by the engine reducer.
 *
 * The canonical Zod-validated `Choice` (with full `Predicate`/`EffectOp`
 * discriminated unions for `requires`/`effects`) lives in
 * `src/content/schema.ts` (todo 4). The engine narrows these in todo 6; here
 * they are opaque so the engine compiles without a content dependency.
 */
export interface Choice {
  id: string;
  label_sid: string;
  forbidden: boolean;
  requires: unknown[];
  effects: unknown[];
}
