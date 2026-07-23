// Property test: the no-karma-to-identity invariant (plan todo 8).
//
// This is the load-bearing fence for the Buddhist-ethics frame of the game:
// accumulated karma (echoes, intent roots, vows) MUST NEVER project into a
// social-identity axis of the next life. Concretely, the NextLifeSeed returned
// by `applyEchoesToNextLife` must never expose a field whose name matches one
// of the forbidden identity axes: gender, caste, race, disability, wealth,
// species, social_identity.
//
// We run a fast-check property over 1000 randomly generated KarmaState
// instances and assert the invariant holds for every one. A second test proves
// the check is non-vacuous — it would catch a regression that leaked any
// forbidden field within <= 5 cases (mirroring the plan's acceptance probe:
// "manually inject result.gender = 'x' -> test fails within <= 5 cases").

import * as fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { applyEchoesToNextLife, emptyKarma } from '../echo';
import { createRng } from '../rng';
import type { Echo, EraId, KarmaState, LifeId, NextLifeSeed } from '../types';

// ---------------------------------------------------------------------------
// Forbidden-identity matcher
// ---------------------------------------------------------------------------

/**
 * A NextLifeSeed key matching this regex is a hard invariant violation.
 *
 * Anchored (`^...$`) and case-insensitive so it catches exact axis names only
 * — it will NOT match substrings of legitimately-named seed fields such as
 * `permitted_imagery_tag` or `starting_resources_modifier`. If a new identity
 * axis is added to the design, extend the alternation here.
 */
const FORBIDDEN_IDENTITY_RE = /^(gender|caste|race|disability|wealth|species|social_identity)$/i;

/**
 * True iff `seed` exposes any forbidden identity axis as an own enumerable key.
 *
 * Generic over any object shape so the same predicate works on the production
 * `NextLifeSeed` and on the synthetic poisoned object used by the non-vacuous
 * regression probe below. `Object.keys` accepts any `object` — no index
 * signature is required, which matters because TS interfaces (like
 * `NextLifeSeed`) do not carry an implicit string index signature.
 */
function leaksIdentityAxis<T extends object>(seed: T): boolean {
  return Object.keys(seed).some((key) => FORBIDDEN_IDENTITY_RE.test(key));
}

// ---------------------------------------------------------------------------
// Deterministic inputs
// ---------------------------------------------------------------------------

/** Fixed era id for the property sweep; value is irrelevant to the invariant. */
const TEST_ERA = 'era:test' as EraId;

/**
 * Fixed NON-ZERO seed for the deterministic RNG used inside the property body.
 *
 * NOTE: plan todo 8's spec text wrote `createRng(0n)`, but the xoshiro128**
 * contract rejects seed 0 (it decomposes to an all-zero state and throws
 * RangeError — see `rng-impl.ts` and `__tests__/rng.test.ts`). Any fixed
 * non-zero seed keeps every one of the 1000 runs fully deterministic; this
 * constant is arbitrary and pinned here for review.
 */
const PROPERTY_RNG_SEED = 0x1234_5678_9abc_def0n;

// ---------------------------------------------------------------------------
// KarmaState arbitraries
//
// `KarmaState.accumulated_intent_roots` is a `Record<IntentRoot, number>`, so
// it must carry ALL FOUR roots. We model it with `fc.record` (not
// `fc.dictionary`) to guarantee every key is present and the generated value is
// a structurally valid KarmaState — a property test over invalid inputs would
// prove nothing. `vows`, by contrast, is a genuinely open `Record<string, _>`,
// so `fc.dictionary` is the right model there.
// ---------------------------------------------------------------------------

/** Branded LifeId from a random string (brand is structural-only, never read). */
const lifeIdArb: fc.Arbitrary<LifeId> = fc.string().map((s): LifeId => s as LifeId);

const echoArb: fc.Arbitrary<Echo> = fc.record({
  type: fc.constantFrom('tendency', 'vow', 'unresolved_attachment', 'pattern_break'),
  key: fc.string(),
  weight: fc.float({ min: -1, max: 1, noNaN: true }),
  source_life_id: lifeIdArb,
  narrative_sid: fc.string(),
});

const intentRootsArb: fc.Arbitrary<Record<'care' | 'greed' | 'aversion' | 'delusion', number>> =
  fc.record({
    care: fc.integer({ min: 0, max: 50 }),
    greed: fc.integer({ min: 0, max: 50 }),
    aversion: fc.integer({ min: 0, max: 50 }),
    delusion: fc.integer({ min: 0, max: 50 }),
  });

const karmaArb: fc.Arbitrary<KarmaState> = fc.record({
  echoes: fc.array(echoArb, { maxLength: 10 }),
  accumulated_intent_roots: intentRootsArb,
  vows: fc.dictionary(fc.string(), fc.constantFrom('kept', 'broken', 'declared')),
});

// ---------------------------------------------------------------------------
// The invariant
// ---------------------------------------------------------------------------

describe('no-karma-to-identity invariant (plan todo 8)', () => {
  it('applyEchoesToNextLife never leaks an identity axis across 1000 random KarmaStates', () => {
    fc.assert(
      fc.property(karmaArb, (karma) => {
        // A fresh deterministic RNG per run — same seed => identical stream, so
        // the whole sweep is reproducible. The function under test currently
        // ignores the RNG, but we pass a real one so the test stays correct
        // once todo 7's full projection lands.
        const seed: NextLifeSeed = applyEchoesToNextLife(
          karma,
          TEST_ERA,
          createRng(PROPERTY_RNG_SEED),
        );
        return !leaksIdentityAxis(seed);
      }),
      { numRuns: 1000 },
    );
  });

  it('the check is non-vacuous: a leaked identity axis fails the property within 5 runs', () => {
    // Sanity: every forbidden token is individually recognized by the matcher.
    // If this ever regresses, the 1000-case sweep above would pass vacuously
    // while proving nothing.
    const forbiddenTokens = [
      'gender',
      'caste',
      'race',
      'disability',
      'wealth',
      'species',
      'social_identity',
      // Case-insensitivity spot-checks.
      'GENDER',
      'Social_Identity',
    ];
    const cleanSeed: NextLifeSeed = applyEchoesToNextLife(
      emptyKarma(),
      TEST_ERA,
      createRng(PROPERTY_RNG_SEED),
    );
    expect(leaksIdentityAxis(cleanSeed)).toBe(false);
    for (const token of forbiddenTokens) {
      const poisoned = { ...cleanSeed, [token]: 'x' };
      expect(leaksIdentityAxis(poisoned)).toBe(true);
    }

    // End-to-end mutation probe: simulate the exact regression the plan calls
    // out ("inject result.gender = 'x'") and assert the SAME fc.property
    // machinery used above fails within 5 runs. This proves the 1000-case test
    // is genuinely sensitive, not silently always-passing.
    expect(() => {
      fc.assert(
        fc.property(karmaArb, (karma) => {
          const seed = applyEchoesToNextLife(karma, TEST_ERA, createRng(PROPERTY_RNG_SEED));
          // Poisoned adapter — stands in for the production function having
          // regressed to emit `gender`. No production code is modified.
          const poisoned = { ...seed, gender: 'x' };
          return !leaksIdentityAxis(poisoned);
        }),
        { numRuns: 5 },
      );
    }).toThrow();
  });
});
