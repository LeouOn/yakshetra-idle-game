// Predicate-key resolvability — stop a misauthored gate from silently never
// being true.
//
// `src/engine/predicates.ts` reads an unknown key as 0 and says nothing, so a
// key the engine never sets is a gate that cannot open. This module walks every
// predicate the player-facing content can gate on (event trigger, choice
// requires, ending trigger) and checks the key against the keys the engine can
// actually produce.
//
// Producers, read from the engine (not guessed):
//   - fixed scalars: age, turn (numeric), chosen_lens (string);
//   - resources: the six LifeState resource keys, plus any `add_resource`
//     key with a POSITIVE delta (a key only ever spent is never > 0, which is
//     the `wealth` case);
//   - `has_resource`: any `add_resource` key (even a negative one creates it);
//   - skills: `add_skill` keys;
//   - flags: `add_flag` keys;
//   - relationships: no predicate op reads `state.relationships`, so a
//     relationship target is not a resolvable predicate key.
//
// Roles' `starting_resources` are intentionally NOT producers: the engine does
// not apply them at life creation (a pending rules decision, see the exemption
// below). Pure: data in, violations out.
//
// What this rule does NOT see. It is a one-step key check, not a reachability proof:
//   - `age` is accepted, but nothing raises it above 0, so `age >= 25` (the persecution
//     edict) and `age >= 60` (the old-age ending) can never be true;
//   - a flag whose only producer sits inside an event that can never open is accepted
//     (`vow:protect-family:broken`, set only by the unreachable vow-reminder, so the
//     vow-bound ending is dead too);
//   - endings are evaluated only on idle lives (`simulateIdleTicks`), which receive no
//     event effects and whose practices add no flags, so an ending that reads an
//     event-produced flag (`accepted-residence`, `requested-next-life`) never fires.
// KNOWN_DEAD_GATES below is therefore a floor, not the list of every dead gate.

import type { EffectOp, EraPack, Ending, Practice, Predicate } from './schema';

export const R_RESOLVABLE_PREDICATE_KEY = 'R-RESOLVABLE-PREDICATE-KEY' as const;

/** The six resource keys LifeState always carries (`ResourceId`). */
export const BASE_RESOURCE_KEYS: readonly string[] = [
  'time',
  'energy',
  'provisions',
  'trust',
  'skill',
  'obligation',
];

/** Fixed scalar keys the evaluator reads directly. */
const FIXED_NUMERIC_KEYS: readonly string[] = ['age', 'turn'];
const FIXED_STRING_KEYS: readonly string[] = ['chosen_lens'];

/**
 * Flags the engine writes outside any `add_flag` effect: `applyStudioToNextLife`
 * (src/engine/studio-return.ts) seeds them into a new life from the bench. A gate on one
 * of these is real, so the rule accepts it. Content does not import the engine, so the
 * shapes are repeated here and a test pins them to the engine's own helpers.
 */
const STUDIO_RETURN_FLAG_PREFIXES: readonly string[] = ['pin:', 'place:', 'world_draft:'];
const STUDIO_RETURN_FLAG_EXACT: readonly string[] = ['world:assembled'];

export function isStudioReturnFlag(key: string): boolean {
  return (
    STUDIO_RETURN_FLAG_EXACT.includes(key) ||
    STUDIO_RETURN_FLAG_PREFIXES.some((prefix) => key.startsWith(prefix))
  );
}

/**
 * Keys that are known dead today and are pending a rules decision, not a lint
 * fix. Each entry must stay explicit and commented: the rule is green for the
 * packs, and a NEW dead key fails immediately. Do not add a key here unless a
 * maintainer decision is the fix.
 */
export const KNOWN_DEAD_GATES: Readonly<Record<string, string>> = {
  wealth:
    'No authored effect adds positive wealth, and role starting_resources are not applied at life creation; the two Tang wealth gates can never open. Pending rules decision: lives do not age, roles do not set starting resources, wealth does not exist.',
  'echoes.pattern_break_count':
    'Nothing in the engine writes echoes.pattern_break_count; the Garden blessing ending trigger can never be true. Pending rules decision (same pending rules as wealth).',
  has_brother:
    'No role, echo seed or event sets the has_brother flag (found by this rule while linting the Tang pack; c1 saw the event was never shown). The family tie is not a life-start property. Pending rules decision: roles do not set starting flags; a brother is not part of the starting state.',
  'victim-of-purge':
    'Found by this rule: no event or practice adds victim-of-purge; the Tang violence ending branch cannot fire. Pending content decision: which persecution outcome should set it.',
  'bandit-casualty':
    'Found by this rule: no event or practice adds bandit-casualty; the Tang violence ending branch cannot fire. Pending content decision: which road/bandit event should set it.',
  'vow:protect-family':
    'Found by this rule: the vow is only ever removed, never declared, so the Fantasy vow-reminder event and its three choices can never open. Pending rules decision: how a starting/declared vow enters a life (the vow mechanic is authored but has no entry point).',
};

export interface PredicateKeySpaces {
  readonly numeric: ReadonlySet<string>;
  readonly string: ReadonlySet<string>;
  readonly resources: ReadonlySet<string>;
  readonly skills: ReadonlySet<string>;
  readonly flags: ReadonlySet<string>;
}

function addEffects(
  spaces: {
    positiveResources: Set<string>;
    anyResources: Set<string>;
    skills: Set<string>;
    flags: Set<string>;
  },
  effects: readonly EffectOp[],
): void {
  for (const effect of effects) {
    if (effect.op === 'add_resource') {
      spaces.anyResources.add(effect.key);
      if (effect.delta > 0) {
        spaces.positiveResources.add(effect.key);
      }
    } else if (effect.op === 'add_skill') {
      spaces.skills.add(effect.key);
    } else if (effect.op === 'add_flag') {
      spaces.flags.add(effect.key);
    }
  }
}

/** Collect every key the engine can produce somewhere in this pack. */
export function collectPredicateKeySpaces(
  pack: EraPack,
  practices: readonly Practice[] = [],
): PredicateKeySpaces {
  const acc = {
    positiveResources: new Set<string>(BASE_RESOURCE_KEYS),
    anyResources: new Set<string>(BASE_RESOURCE_KEYS),
    skills: new Set<string>(),
    flags: new Set<string>(),
  };
  for (const event of pack.events) {
    for (const choice of event.choices) {
      addEffects(acc, choice.effects);
    }
  }
  for (const practice of practices) {
    addEffects(acc, practice.effects);
  }
  return {
    numeric: new Set([...FIXED_NUMERIC_KEYS, ...acc.positiveResources, ...acc.skills]),
    string: new Set(FIXED_STRING_KEYS),
    resources: new Set(acc.anyResources),
    skills: new Set(acc.skills),
    flags: new Set(acc.flags),
  };
}

function keyAllowed(op: Predicate['op'], key: string, spaces: PredicateKeySpaces): boolean {
  switch (op) {
    case 'gte':
    case 'lte':
    case 'gt':
    case 'lt':
      return spaces.numeric.has(key);
    case 'eq':
      return spaces.numeric.has(key) || spaces.string.has(key);
    case 'in':
      return spaces.string.has(key);
    case 'has_flag':
      return spaces.flags.has(key) || isStudioReturnFlag(key);
    case 'has_skill':
      return spaces.skills.has(key);
    case 'has_resource':
      return spaces.resources.has(key);
    default:
      return true; // and/or/not/intent_root_gte carry no key
  }
}

export interface PredicateKeyViolation {
  readonly rule: string;
  readonly severity: 'error';
  readonly message: string;
  readonly location: string;
}

function visit(
  predicate: Predicate,
  spaces: PredicateKeySpaces,
  location: string,
  out: PredicateKeyViolation[],
): void {
  switch (predicate.op) {
    case 'and':
    case 'or':
      for (const operand of predicate.operands) {
        visit(operand, spaces, location, out);
      }
      return;
    case 'not':
      visit(predicate.operand, spaces, location, out);
      return;
    case 'intent_root_gte':
      return;
    default: {
      const key = predicate.key;
      if (KNOWN_DEAD_GATES[key] !== undefined) {
        return; // explicit, commented exemption
      }
      if (keyAllowed(predicate.op, key, spaces)) {
        return;
      }
      const expected =
        predicate.op === 'has_flag'
          ? 'a flag added by an add_flag effect'
          : predicate.op === 'has_skill'
            ? 'a skill added by an add_skill effect'
            : predicate.op === 'has_resource'
              ? 'a base resource or any add_resource key'
              : predicate.op === 'in'
                ? 'chosen_lens'
                : 'age, turn, a positive-gain resource, or a skill';
      out.push({
        rule: R_RESOLVABLE_PREDICATE_KEY,
        severity: 'error',
        message: `predicate key "${key}" (${predicate.op}) is never produced by the engine; expected ${expected}`,
        location,
      });
      return;
    }
  }
}

/** Walk every predicate-bearing point in the pack. */
export function predicateKeyViolations(
  pack: EraPack,
  practices: readonly Practice[],
  endings: readonly Ending[] = [],
): readonly PredicateKeyViolation[] {
  const out: PredicateKeyViolation[] = [];
  const spaces = collectPredicateKeySpaces(pack, practices);
  for (const event of pack.events) {
    if (event.trigger !== undefined) {
      visit(event.trigger, spaces, `events[${event.id}].trigger`, out);
    }
    for (const choice of event.choices) {
      for (const [index, predicate] of choice.requires.entries()) {
        visit(
          predicate,
          spaces,
          `events[${event.id}].choices[${choice.id}].requires[${index}]`,
          out,
        );
      }
    }
  }
  for (const ending of endings) {
    visit(ending.trigger, spaces, `endings[${ending.id}].trigger`, out);
  }
  return out;
}
